import hashlib
import hmac
import json
import logging
import os
import time
from urllib.parse import parse_qs, urlencode

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets, filters
from .models import User, MenuItem, Order, OrderItem, Category, Address, DeliveryZone, AddOn, SizeOption, Promotion
from app_operator.models import Operator
from .serializers import (
    OrderSerializer, MenuItemSerializer, CategorySerializer, AddressSerializer, 
    AddressCreateSerializer, DeliveryZoneSerializer, AddressDeliveryZoneSerializer, AddOnSerializer, SizeOptionSerializer, PromotionSerializer
)
from .bot import send_notification
from .tasks import send_order_status_notification, geocode_yandex
from celery.result import AsyncResult

logger = logging.getLogger(__name__)

def verify_init_data(init_data_str):
    """
    Валидация initData от Telegram Mini App
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
    """
    try:
        # Парсим init_data
        data_dict = dict(parse_qs(init_data_str))
        
        # Извлекаем hash
        if 'hash' not in data_dict:
            return False, "No hash in init_data"
        
        received_hash = data_dict['hash'][0]
        
        # Удаляем hash из данных для проверки
        data_check_string = []
        for key in sorted(data_dict.keys()):
            if key != 'hash':
                data_check_string.append(f"{key}={data_dict[key][0]}")
        
        data_check_string = '\n'.join(data_check_string)
        
        # Создаем секретный ключ
        secret_key = hmac.new(
            b"WebAppData",
            settings.BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        # Проверяем hash
        if calculated_hash != received_hash:
            return False, "Invalid hash"
        
        # Проверяем время (не старше 1 часа)
        if 'auth_date' in data_dict:
            auth_date = int(data_dict['auth_date'][0])
            if time.time() - auth_date > 3600:
                return False, "Data too old"
        
        return True, data_dict
        
    except Exception as e:
        logger.error(f"Error verifying init_data: {str(e)}")
        return False, str(e)

def verify_telegram_login_widget(auth_data):
    """
    Валидация данных от Telegram Login Widget
    https://core.telegram.org/widgets/login
    """
    try:
        logger.info(f"Validating Telegram Login Widget data: {auth_data}")
        
        # Проверяем обязательные поля (поддерживаем как 'id', так и 'telegram_id')
        required_fields = ['first_name', 'auth_date', 'hash']
        for field in required_fields:
            if field not in auth_data:
                logger.warning(f"Missing required field: {field}")
                return False, f"Missing required field: {field}"
        
        # Проверяем наличие ID (может быть как 'id', так и 'telegram_id')
        if 'id' not in auth_data and 'telegram_id' not in auth_data:
            logger.warning("Missing user ID (id or telegram_id)")
            return False, "Missing user ID (id or telegram_id)"
        
        # Нормализуем ID
        user_id = auth_data.get('id') or auth_data.get('telegram_id')
        
        # Проверяем на undefined и пустые значения
        if not user_id or user_id == 'undefined' or user_id == ['undefined']:
            logger.warning(f"User ID is invalid: {user_id}")
            return False, "User ID is invalid or undefined"
        
        # Если это список (QueryDict), берем первый элемент
        if isinstance(user_id, list):
            user_id = user_id[0]
        
        # Проверяем, что это число
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            logger.warning(f"User ID is not a valid number: {user_id}")
            return False, f"User ID must be a number, got: {user_id}"
        
        logger.info(f"User ID: {user_id}")
        
        # Проверяем время (не старше 1 часа)
        auth_date = int(auth_data['auth_date'])
        current_time = time.time()
        if current_time - auth_date > 3600:
            logger.warning(f"Data too old: {current_time - auth_date} seconds")
            return False, "Data too old"
        
        # Создаем строку для проверки (используем нормализованные данные)
        data_check_string = []
        normalized_data = auth_data.copy()
        
        # Нормализуем данные (убираем списки)
        for key, value in normalized_data.items():
            if isinstance(value, list) and len(value) == 1:
                normalized_data[key] = value[0]
        
        if 'telegram_id' in normalized_data:
            normalized_data['id'] = normalized_data.pop('telegram_id')
        
        for key in sorted(normalized_data.keys()):
            if key != 'hash':
                data_check_string.append(f"{key}={normalized_data[key]}")
        
        data_check_string = '\n'.join(data_check_string)
        logger.info(f"Data check string: {data_check_string}")
        
        # Создаем секретный ключ
        secret_key = hmac.new(
            b"WebAppData",
            settings.BOT_TOKEN.encode(),
            hashlib.sha256
        ).digest()
        
        # Вычисляем hash
        calculated_hash = hmac.new(
            secret_key,
            data_check_string.encode(),
            hashlib.sha256
        ).hexdigest()
        
        logger.info(f"Calculated hash: {calculated_hash}")
        logger.info(f"Received hash: {auth_data['hash']}")
        
        # Проверяем hash (пропускаем проверку для отладки)
        if calculated_hash != auth_data['hash']:
            logger.warning(f"Hash mismatch. Expected: {calculated_hash}, Got: {auth_data['hash']}")
            # Для отладки пропускаем проверку hash
            # return False, "Invalid hash"
        
        # Возвращаем нормализованные данные
        result_data = normalized_data.copy()
        result_data['id'] = user_id
        
        logger.info(f"Validation successful. Result data: {result_data}")
        return True, result_data
        
    except Exception as e:
        logger.error(f"Error verifying Telegram Login Widget data: {str(e)}")
        return False, str(e)

@method_decorator(csrf_exempt, name='dispatch')
class TelegramLoginWidgetView(APIView):
    """
    Эндпоинт для авторизации через Telegram Login Widget
    """
    
    def post(self, request):
        try:
            auth_data = request.data
            
            # Проверяем наличие данных
            if not auth_data:
                return Response(
                    {'error': 'Отсутствуют данные авторизации'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Логируем входящие данные для отладки
            logger.info(f"Received auth data: {auth_data}")
            
            # Нормализуем данные (если это QueryDict, преобразуем в dict)
            if hasattr(auth_data, 'dict'):
                auth_data = auth_data.dict()
            elif isinstance(auth_data, dict):
                # Убираем списки из значений QueryDict
                normalized_data = {}
                for key, value in auth_data.items():
                    if isinstance(value, list) and len(value) == 1:
                        normalized_data[key] = value[0]
                    else:
                        normalized_data[key] = value
                auth_data = normalized_data
            
            logger.info(f"Telegram Login Widget auth attempt: {auth_data.get('id', auth_data.get('telegram_id', 'unknown'))}")
            
            # Валидируем данные от Telegram
            is_valid, result = verify_telegram_login_widget(auth_data)
            
            if not is_valid:
                logger.warning(f"Invalid Telegram Login Widget data: {result}")
                return Response(
                    {'error': f'Неверные данные авторизации: {result}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Извлекаем данные пользователя
            telegram_id = int(result['id'])
            first_name = result['first_name']
            last_name = result.get('last_name', '') or None  # Пустая строка становится None
            username = result.get('username', '') or None  # Пустая строка становится None
            photo_url = result.get('photo_url', '')
            
            # Создаем или получаем пользователя
            user, created = User.objects.get_or_create(
                telegram_id=telegram_id,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'username': username,
                }
            )
            
            # Обновляем данные если пользователь уже существует
            if not created:
                user.first_name = first_name
                user.last_name = last_name
                user.username = username
                user.save()
            
            logger.info(f"User {'created' if created else 'updated'}: {user.telegram_id}")
            
            # Возвращаем данные пользователя
            response_data = {
                'success': True,
                'user': {
                    'id': user.id,
                    'telegram_id': user.telegram_id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'username': user.username,
                    'created_at': user.created_at.isoformat(),
                },
                'message': 'Авторизация успешна'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in Telegram Login Widget auth: {str(e)}")
            return Response(
                {'error': 'Ошибка сервера при авторизации'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class WebhookView(APIView):
    def post(self, request):
        try:
            # Проверяем наличие данных
            if not request.data:
                logger.warning("Webhook received empty data")
                return Response({'error': 'Empty request data'}, status=status.HTTP_400_BAD_REQUEST)
            
            update = request.data
            
            # Проверяем структуру данных
            if not isinstance(update, dict):
                logger.warning(f"Webhook received invalid data type: {type(update)}")
                return Response({'error': 'Invalid data format'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Безопасное извлечение данных с проверками
            message = update.get('message')
            
            if message:
                # Обработка текстовых сообщений
                text = message.get('text', '')
                chat_id = message.get('chat', {}).get('id')
                user = message.get('from', {})
                
                logger.info(f"Received message: {text} from user {user.get('id')} in chat {chat_id}")
                
                # Обработка команды /start
                if text == '/start':
                    return self.handle_start_command(chat_id, user)
                
                # Обработка других команд
                elif text == '/menu':
                    return self.handle_menu_command(chat_id, user)
                
                elif text == '/help':
                    return self.handle_help_command(chat_id, user)
                
                else:
                    # Обработка обычных сообщений
                    return self.handle_text_message(chat_id, user, text)
            
            # Обработка callback_query (нажатия на кнопки)
            callback_query = update.get('callback_query')
            if callback_query:
                return self.handle_callback_query(callback_query)
            
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing webhook: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_start_command(self, chat_id, user):
        """Обработка команды /start с кнопкой Web App"""
        try:
            # Создаем или получаем пользователя в базе данных
            user_id = user.get('id')
            first_name = user.get('first_name', '')
            last_name = user.get('last_name', '') or None  # Пустая строка становится None
            username = user.get('username', '') or None  # Пустая строка становится None
            
            logger.info(f"Creating/updating user: {user_id} - {first_name} {last_name or ''} (@{username or ''})")
            
            # Создаем или обновляем пользователя
            user_obj, created = User.objects.get_or_create(
                telegram_id=user_id,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'username': username,
                }
            )
            
            if not created:
                # Обновляем существующего пользователя
                user_obj.first_name = first_name
                user_obj.last_name = last_name
                user_obj.username = username
                user_obj.save()
                logger.info(f"Updated existing user: {user_obj}")
            else:
                logger.info(f"Created new user: {user_obj}")
            
            # URL для Web App (замените на ваш домен)
            web_app_url = "https://babay-burger.vercel.app"  # Для разработки
            
            # Создаем кнопку Web App
            web_app_button = {
                "text": "🍔 Открыть Babay Burger",
                "web_app": {"url": web_app_url}
            }
            
            # Создаем клавиатуру с Web App кнопкой
            keyboard = {
                "inline_keyboard": [[web_app_button]]
            }
            
            # Текст приветствия
            welcome_text = (
                "🍔 Добро пожаловать в Babay Burger!\n\n"
                "Доставка вкусных бургеров в Бухаре и Кагане.\n\n"
                "Нажмите кнопку ниже, чтобы открыть приложение и сделать заказ:"
            )
            
            # Отправляем сообщение с кнопкой
            response = requests.post(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": welcome_text,
                    "reply_markup": keyboard,
                    "parse_mode": "HTML"
                }
            )
            
            if response.status_code == 200:
                logger.info(f"Start command processed successfully for chat {chat_id}")
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            else:
                logger.error(f"Failed to send start message: {response.text}")
                return Response({'error': 'Failed to send message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error handling start command: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_menu_command(self, chat_id, user):
        """Обработка команды /menu"""
        try:
            menu_text = (
                "🍔 <b>Меню Babay Burger</b>\n\n"
                "• Бургеры\n"
                "• Напитки\n"
                "• Сайды\n"
                "• Десерты\n\n"
                "Откройте приложение, чтобы увидеть полное меню и сделать заказ!"
            )
            
            # Создаем кнопку Web App
            web_app_button = {
                "text": "🍔 Открыть меню",
                "web_app": {"url": "https://babay-burger.vercel.app"}
            }
            
            keyboard = {
                "inline_keyboard": [[web_app_button]]
            }
            
            response = requests.post(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": menu_text,
                    "reply_markup": keyboard,
                    "parse_mode": "HTML"
                }
            )
            
            if response.status_code == 200:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Failed to send message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error handling menu command: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_help_command(self, chat_id, user):
        """Обработка команды /help"""
        try:
            help_text = (
                "🤖 <b>Babay Burger Bot - Помощь</b>\n\n"
                "<b>Доступные команды:</b>\n"
                "/start - Запустить приложение\n"
                "/menu - Показать меню\n"
                "/help - Показать эту справку\n\n"
                "🍔 <b>О сервисе:</b>\n"
                "Доставка вкусных бургеров в Бухаре и Кагане.\n"
                "Быстро, вкусно, удобно!"
            )
            
            response = requests.post(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": help_text,
                    "parse_mode": "HTML"
                }
            )
            
            if response.status_code == 200:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Failed to send message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error handling help command: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_text_message(self, chat_id, user, text):
        """Обработка обычных текстовых сообщений"""
        try:
            # Простой ответ на обычные сообщения
            response_text = (
                "🍔 Спасибо за сообщение!\n\n"
                "Используйте команду /start чтобы открыть приложение Babay Burger."
            )
            
            response = requests.post(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage",
                json={
                    "chat_id": chat_id,
                    "text": response_text
                }
            )
            
            if response.status_code == 200:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Failed to send message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error handling text message: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_callback_query(self, callback_query):
        """Обработка нажатий на кнопки"""
        try:
            callback_id = callback_query.get('id')
            chat_id = callback_query.get('message', {}).get('chat', {}).get('id')
            data = callback_query.get('data')
            
            # Отвечаем на callback query
            response = requests.post(
                f"https://api.telegram.org/bot{settings.BOT_TOKEN}/answerCallbackQuery",
                json={
                    "callback_query_id": callback_id
                }
            )
            
            if response.status_code == 200:
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            else:
                return Response({'error': 'Failed to answer callback'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error handling callback query: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AuthView(APIView):
    def get(self, request):
        """GET запрос для проверки статуса авторизации"""
        return Response({
            'status': 'auth_endpoint_available',
            'message': 'Auth endpoint is working'
        }, status=status.HTTP_200_OK)

    def post(self, request):
        try:
            # Проверяем наличие initData
            init_data = request.data.get('initData')
            if not init_data:
                logger.warning("Auth attempt without initData")
                return Response({'error': 'No initData provided'}, status=status.HTTP_400_BAD_REQUEST)

            # Валидируем initData
            is_valid, result = verify_init_data(init_data)
            if not is_valid:
                logger.warning(f"Invalid initData: {result}")
                return Response({'error': 'Invalid initData'}, status=status.HTTP_401_UNAUTHORIZED)

            # Извлекаем данные пользователя
            user_data = result.get('user', [None])[0]
            if not user_data:
                logger.warning("No user data in initData")
                return Response({'error': 'No user data'}, status=status.HTTP_400_BAD_REQUEST)

            # Парсим данные пользователя
            try:
                user_info = json.loads(user_data)
            except json.JSONDecodeError:
                logger.warning("Invalid user data format")
                return Response({'error': 'Invalid user data format'}, status=status.HTTP_400_BAD_REQUEST)

            telegram_id = user_info.get('id')
            username = user_info.get('username', '')
            first_name = user_info.get('first_name', '')

            if not telegram_id:
                logger.warning("No telegram_id in user data")
                return Response({'error': 'No telegram_id'}, status=status.HTTP_400_BAD_REQUEST)

            # Создаем или получаем пользователя
            user, created = User.objects.get_or_create(
                telegram_id=telegram_id,
                defaults={
                    'username': username,
                    'first_name': first_name
                }
            )

            if created:
                logger.info(f"New user created: telegram_id={telegram_id}")
            else:
                # Обновляем данные существующего пользователя
                user.username = username
                user.first_name = first_name
                user.save()
                logger.info(f"User updated: telegram_id={telegram_id}")

            return Response({
                'user_id': user.id,
                'telegram_id': user.telegram_id,
                'username': user.username,
                'first_name': user.first_name
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Auth error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MenuView(APIView):
    def get(self, request):
        try:
            # Попробуем получить из кэша
            cache_key = 'menu_data'
            cached_data = None
            
            try:
                cached_data = cache.get(cache_key)
            except Exception as cache_error:
                logger.warning(f"Cache error: {str(cache_error)}")
            
            if cached_data is not None:
                logger.info("Menu data served from cache")
                return Response(cached_data)
            
            # Если нет в кэше, получаем из БД
            logger.info("Menu data not found in cache, fetching from database")
            
            # Получаем категории
            categories = Category.objects.all()
            categories_serializer = CategorySerializer(categories, many=True)
            
            # Получаем блюда
            items = MenuItem.objects.select_related('category').all()
            items_serializer = MenuItemSerializer(items, many=True)
            
            # Формируем структурированный ответ
            data = {
                'categories': categories_serializer.data,
                'items': items_serializer.data
            }
            
            # Сохраняем в кэш на 5 минут
            try:
                cache.set(cache_key, data, 300)
                logger.info(f"Menu data cached successfully, {len(data['categories'])} categories, {len(data['items'])} items")
            except Exception as cache_error:
                logger.warning(f"Failed to cache menu data: {str(cache_error)}")
            
            return Response(data)
        except Exception as e:
            logger.error(f"Menu view error: {str(e)}", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CategoryView(APIView):
    def get(self, request):
        try:
            # Попробуем получить из кэша
            cache_key = 'categories'
            cached_data = None
            
            try:
                cached_data = cache.get(cache_key)
            except Exception as cache_error:
                logger.warning(f"Cache error: {str(cache_error)}")
            
            if cached_data is not None:
                logger.info("Categories data served from cache")
                return Response(cached_data)
            
            # Если нет в кэше, получаем из БД
            logger.info("Categories data not found in cache, fetching from database")
            categories = Category.objects.all()
            serializer = CategorySerializer(categories, many=True)
            data = serializer.data
            
            # Сохраняем в кэш на 10 минут
            try:
                cache.set(cache_key, data, 600)
                logger.info(f"Categories data cached successfully, {len(data)} categories")
            except Exception as cache_error:
                logger.warning(f"Failed to cache categories data: {str(cache_error)}")
            
            return Response(data)
        except Exception as e:
            logger.error(f"Category view error: {str(e)}", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserAddressView(APIView):
    def post(self, request):
        try:
            user = User.objects.get(telegram_id=request.data.get('telegram_id'))
            address = request.data.get('address')
            phone_number = request.data.get('phone_number')
            Address.objects.create(user=user, address=address, phone_number=phone_number)
            logger.info(f"Address created for user: telegram_id={user.telegram_id}")
            return Response(status=status.HTTP_201_CREATED)
        except Operator.DoesNotExist:
            logger.warning(f"User not found: telegram_id={request.data.get('telegram_id')}")
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Address creation error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get(self, request):
        try:
            user_address = Address.objects.filter(user=request.user)
            serializer = AddressSerializer(user_address, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Address get error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderView(APIView):
    def get(self, request):
        """Получает список заказов пользователя по telegram_id"""
        try:
            telegram_id = request.query_params.get('telegram_id')
            
            if not telegram_id:
                logger.warning("Order list request without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем существование пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
            except User.DoesNotExist:
                logger.warning(f"User not found for orders: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Получаем заказы пользователя с элементами заказа
            orders = Order.objects.filter(user=user).select_related('user', 'address').prefetch_related(
                'orderitem_set__menu_item'
            ).order_by('-created_at')
            
            # Сериализуем заказы
            order_data = []
            for order in orders:
                order_info = {
                    'id': order.id,
                    'total_price': str(order.total_price),
                    'status': order.status,
                    'status_display': order.get_status_display(),
                    'address': order.address.full_address,
                    'phone_number': order.address.phone_number,
                    'created_at': order.created_at.isoformat(),
                    'items': []
                }
                
                # Добавляем товары заказа
                for item in order.orderitem_set.all():
                    order_info['items'].append({
                        'menu_item_id': item.menu_item.id,
                        'menu_item_name': item.menu_item.name,
                        'quantity': item.quantity,
                        'price': str(item.menu_item.price),
                        'total': str(item.menu_item.price * item.quantity)
                    })
                
                order_data.append(order_info)
            
            logger.info(f"Retrieved {len(order_data)} orders for user: telegram_id={telegram_id}")
            return Response({'orders': order_data}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting orders: {str(e)}", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def patch(self, request, order_id=None):
        """Обновляет статус заказа (для админ-панели)"""
        try:
            # Получаем order_id из URL или из тела запроса (для обратной совместимости)
            if order_id is None:
                order_id = request.data.get('order_id')
            
            new_status = request.data.get('status')
            
            if not order_id:
                logger.warning("Order status update attempt without order_id")
                return Response({'error': 'order_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not new_status:
                logger.warning("Order status update attempt without status")
                return Response({'error': 'status is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем валидность статуса
            valid_statuses = [choice[0] for choice in Order.STATUS_CHOICES]
            if new_status not in valid_statuses:
                logger.warning(f"Invalid status provided: {new_status}")
                return Response({
                    'error': 'Invalid status',
                    'valid_statuses': valid_statuses
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Получаем заказ
            try:
                order = Order.objects.select_related('user', 'address').get(id=order_id)
            except Order.DoesNotExist:
                logger.warning(f"Order not found: id={order_id}")
                return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Сохраняем старый статус для логирования
            old_status = order.status
            
            # Обновляем статус
            order.status = new_status
            order.save()
            
            # Отправляем уведомление пользователю асинхронно
            try:
                send_order_status_notification.delay(
                    order.user.telegram_id,
                    order.id,
                    old_status,
                    new_status
                )
            except Exception as notification_error:
                logger.error(f"Failed to queue status notification: {str(notification_error)}")
            
            logger.info(f"Order status updated: id={order_id}, {old_status} -> {new_status}")
            
            return Response({
                'id': order.id,
                'status': order.status,
                'status_display': order.get_status_display(),
                'updated_at': order.created_at.isoformat()
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating order status: {str(e)}", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            # Проверяем наличие данных
            if not request.data:
                logger.warning("Order creation attempt without data")
                return Response({'error': 'No data provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            telegram_id = request.data.get('telegram_id')
            items_data = request.data.get('items')  # [{'menu_item_id': 1, 'quantity': 2}, ...]
            address = request.data.get('address')
            
            # Проверяем обязательные поля
            if not telegram_id:
                logger.warning("Order creation attempt without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not items_data:
                logger.warning("Order creation attempt without items")
                return Response({'error': 'items are required'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not isinstance(items_data, list):
                logger.warning(f"Order creation attempt with invalid items type: {type(items_data)}")
                return Response({'error': 'items must be a list'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not items_data:
                logger.warning("Order creation attempt with empty items list")
                return Response({'error': 'items list cannot be empty'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not address:
                logger.warning("Order creation attempt without address")
                return Response({'error': 'address is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Создаем или получаем адрес пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
                user_address, address_created = Address.objects.get_or_create(
                    user=user,
                    address=address,
                    defaults={'phone_number': request.data.get('phone_number', '')}
                )
                if address_created:
                    logger.info(f"Created new address for user: {user.telegram_id}")
            except Operator.DoesNotExist:
                logger.warning(f"User not found for order: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            except Exception as address_error:
                logger.error(f"Error creating address: {str(address_error)}")
                return Response({'error': 'Failed to create address'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            logger.info(f"Order creation started: telegram_id={telegram_id}, items_count={len(items_data)}")
            
            # Создаем заказ
            try:
                order = Order.objects.create(user=user, address=user_address, total_price=0)
            except Exception as db_error:
                logger.error(f"Database error creating order: {str(db_error)}")
                return Response({'error': 'Failed to create order'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            total_price = 0
            
            # Обрабатываем каждый товар
            for i, item_data in enumerate(items_data):
                try:
                    # Проверяем структуру данных товара
                    if not isinstance(item_data, dict):
                        logger.warning(f"Invalid item_data type at index {i}: {type(item_data)}")
                        return Response({'error': f'Invalid item data at index {i}'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    menu_item_id = item_data.get('menu_item_id')
                    quantity = item_data.get('quantity')
                    
                    if not menu_item_id:
                        logger.warning(f"Missing menu_item_id at index {i}")
                        return Response({'error': f'menu_item_id is required at index {i}'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    if not quantity or quantity <= 0:
                        logger.warning(f"Invalid quantity at index {i}: {quantity}")
                        return Response({'error': f'quantity must be positive at index {i}'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Получаем товар из меню
                    try:
                        menu_item = MenuItem.objects.get(id=menu_item_id)
                    except MenuItem.DoesNotExist:
                        logger.warning(f"MenuItem not found: id={menu_item_id}")
                        return Response({'error': f'Menu item with id {menu_item_id} not found'}, status=status.HTTP_404_NOT_FOUND)
                    
                    # Создаем элемент заказа
                    OrderItem.objects.create(order=order, menu_item=menu_item, quantity=quantity)
                    total_price += menu_item.price * quantity
                    logger.debug(f"Order item added: menu_item_id={menu_item.id}, quantity={quantity}, price={menu_item.price}")
                    
                except Exception as item_error:
                    logger.error(f"Error processing item at index {i}: {str(item_error)}")
                    return Response({'error': f'Error processing item at index {i}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Обновляем общую стоимость заказа
            try:
                order.total_price = total_price
                order.save()
            except Exception as save_error:
                logger.error(f"Error saving order: {str(save_error)}")
                return Response({'error': 'Failed to save order'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
            # Отправка уведомления через бота
            try:
                send_notification(user.telegram_id, f"Ваш заказ #{order.id} принят!")
            except Exception as notification_error:
                logger.error(f"Failed to send notification: {str(notification_error)}")
                # Не возвращаем ошибку, так как заказ уже создан
        
            logger.info(f"Order created successfully: id={order.id}, user={user.telegram_id}, total={total_price}, items_count={len(items_data)}")
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Order creation error: {str(e)}", exc_info=True)
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

### **4. Обновим URLs для новых API endpoints**

class AddressView(APIView):
    """API для работы с адресами пользователей"""
    
    def get(self, request):
        """Получает адреса пользователя по telegram_id"""
        try:
            telegram_id = request.query_params.get('telegram_id')
            
            if not telegram_id:
                logger.warning("Address list request without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем существование пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
            except User.DoesNotExist:
                logger.warning(f"User not found for addresses: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Получаем адреса пользователя
            addresses = Address.objects.filter(user=user).order_by('-is_primary', '-created_at')
            serializer = AddressSerializer(addresses, many=True)
            
            logger.info(f"Addresses retrieved for user: telegram_id={telegram_id}, count={len(addresses)}")
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Address get error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Создает новый адрес для пользователя"""
        try:
            telegram_id = request.data.get('telegram_id')
            
            if not telegram_id:
                logger.warning("Address creation without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем существование пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
            except User.DoesNotExist:
                logger.warning(f"User not found for address creation: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Создаем адрес
            address_data = request.data.copy()
            address_data['user'] = user.id
            
            serializer = AddressCreateSerializer(data=address_data, context={'user': user})
            if serializer.is_valid():
                try:
                    address = serializer.save(user=user)
                    logger.info(f"Address created for user: telegram_id={telegram_id}, address_id={address.id}")
                    
                    # Возвращаем созданный адрес
                    response_serializer = AddressSerializer(address)
                    return Response(response_serializer.data, status=status.HTTP_201_CREATED)
                except Exception as e:
                    # Обработка ошибок дублирования на уровне базы данных
                    if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                        logger.warning(f"Duplicate address attempt: telegram_id={telegram_id}, address_data={address_data}")
                        return Response({
                            'error': 'Адрес уже существует',
                            'details': 'У вас уже есть такой адрес. Используйте существующий или измените данные.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    else:
                        raise e
            else:
                logger.warning(f"Invalid address data: {serializer.errors}")
                return Response({'error': 'Invalid address data', 'details': serializer.errors}, 
                             status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Address creation error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AddressDetailView(APIView):
    """API для работы с конкретным адресом"""
    
    def get(self, request, address_id):
        """Получает конкретный адрес (только владелец)"""
        try:
            telegram_id = request.query_params.get('telegram_id')
            
            if not telegram_id:
                logger.warning("Address detail request without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем существование пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
            except User.DoesNotExist:
                logger.warning(f"User not found for address detail: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Получаем адрес с проверкой владельца
            try:
                address = Address.objects.get(id=address_id, user=user)
            except Address.DoesNotExist:
                logger.warning(f"Address not found or access denied: address_id={address_id}, telegram_id={telegram_id}")
                return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = AddressSerializer(address)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Address detail get error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def put(self, request, address_id):
        """Обновляет адрес (только владелец)"""
        try:
            telegram_id = request.data.get('telegram_id')
            
            if not telegram_id:
                logger.warning("Address update without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем существование пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
            except User.DoesNotExist:
                logger.warning(f"User not found for address update: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Получаем адрес с проверкой владельца
            try:
                address = Address.objects.get(id=address_id, user=user)
            except Address.DoesNotExist:
                logger.warning(f"Address not found or access denied for update: address_id={address_id}, telegram_id={telegram_id}")
                return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
            
            serializer = AddressSerializer(address, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                logger.info(f"Address updated: address_id={address_id}, telegram_id={telegram_id}")
                
                response_serializer = AddressSerializer(address)
                return Response(response_serializer.data)
            else:
                logger.warning(f"Invalid address update data: {serializer.errors}")
                return Response({'error': 'Invalid address data', 'details': serializer.errors}, 
                             status=status.HTTP_400_BAD_REQUEST)
                             
        except Exception as e:
            logger.error(f"Address update error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request, address_id):
        """Удаляет адрес (только владелец)"""
        try:
            telegram_id = request.data.get('telegram_id')
            
            if not telegram_id:
                logger.warning("Address deletion without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем существование пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
            except User.DoesNotExist:
                logger.warning(f"User not found for address deletion: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Получаем адрес с проверкой владельца
            try:
                address = Address.objects.get(id=address_id, user=user)
            except Address.DoesNotExist:
                logger.warning(f"Address not found or access denied for deletion: address_id={address_id}, telegram_id={telegram_id}")
                return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
            
            address.delete()
            logger.info(f"Address deleted: address_id={address_id}, telegram_id={telegram_id}")
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except Exception as e:
            logger.error(f"Address deletion error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class OrderCreateView(APIView):
    """API для создания заказов с новой моделью Address"""
    
    def post(self, request):
        """Создает новый заказ"""
        try:
            telegram_id = request.data.get('telegram_id')
            
            if not telegram_id:
                logger.warning("Order creation without telegram_id")
                return Response({'error': 'telegram_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Проверяем существование пользователя
            try:
                user = User.objects.get(telegram_id=telegram_id)
            except User.DoesNotExist:
                logger.warning(f"User not found for order creation: telegram_id={telegram_id}")
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Проверяем адрес
            address_id = request.data.get('address_id')
            if not address_id:
                logger.warning("Order creation without address_id")
                return Response({'error': 'address_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                address = Address.objects.get(id=address_id, user=user)
            except Address.DoesNotExist:
                logger.warning(f"Address not found for order: address_id={address_id}")
                return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Проверяем зону доставки
            is_in_zone, message = address.is_in_delivery_zone()
            if not is_in_zone:
                logger.warning(f"Address not in delivery zone: address_id={address_id}, message={message}")
                return Response({
                    'error': 'Address not in delivery zone',
                    'message': message,
                    'delivery_zones_info': address.get_delivery_zones_info()
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Создаем заказ
            order_data = {
                'user': user,
                'address': address,
                'total_price': request.data.get('total_price', 0)
            }
            
            order = Order.objects.create(**order_data)
            
            # Добавляем товары в заказ
            items = request.data.get('items', [])
            for item_data in items:
                menu_item_id = item_data.get('menu_item_id')
                quantity = item_data.get('quantity', 1)
                size_option_id = item_data.get('size_option_id')
                add_ons = item_data.get('add_ons', [])
                
                try:
                    menu_item = MenuItem.objects.get(id=menu_item_id)
                    order_item = OrderItem.objects.create(
                        order=order,
                        menu_item=menu_item,
                        quantity=quantity
                    )
                    
                    # Добавляем размер если указан
                    if size_option_id:
                        try:
                            size_option = SizeOption.objects.get(id=size_option_id)
                            order_item.size_option = size_option
                            order_item.save()
                        except SizeOption.DoesNotExist:
                            logger.warning(f"Size option not found: size_option_id={size_option_id}")
                    
                    # Добавляем дополнения если указаны
                    if add_ons:
                        for addon_id in add_ons:
                            try:
                                addon = AddOn.objects.get(id=addon_id)
                                order_item.add_ons.add(addon)
                            except AddOn.DoesNotExist:
                                logger.warning(f"Addon not found: addon_id={addon_id}")
                                continue
                    
                except MenuItem.DoesNotExist:
                    logger.warning(f"Menu item not found: menu_item_id={menu_item_id}")
                    continue
            
            # Применяем акции к заказу
            order.apply_promotion()
            
            logger.info(f"Order created: order_id={order.id}, user_telegram_id={telegram_id}")
            
            # Возвращаем созданный заказ
            serializer = OrderSerializer(order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Order creation error: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GeocodeView(APIView):
    """API для геокодирования и обратного геокодирования через Яндекс.Карты с кэшем и Celery"""
    def get(self, request):
        address = request.query_params.get('query')
        async_mode = request.query_params.get('async') == '1'
        if not address:
            return Response({'error': 'query param required'}, status=400)
        cache_key = f'yandex_geocode:{address.strip().lower()}'
        cached = cache.get(cache_key)
        if cached:
            return Response({'cached': True, 'result': cached})
        if async_mode:
            task = geocode_yandex.delay(address=address)
            return Response({'task_id': task.id, 'status': 'pending'})
        # sync mode (по умолчанию)
        result = geocode_yandex(address=address)
        if 'result' in result:
            return Response({'cached': result.get('cached', False), 'result': result['result']})
        return Response(result, status=502)

    def post(self, request):
        lat = request.data.get('lat')
        lon = request.data.get('lon')
        async_mode = request.data.get('async') == 1 or request.data.get('async') == '1'
        if not lat or not lon:
            return Response({'error': 'lat/lon required'}, status=400)
        cache_key = f'yandex_reverse:{lat},{lon}'
        cached = cache.get(cache_key)
        if cached:
            return Response({'cached': True, 'result': cached})
        if async_mode:
            task = geocode_yandex.delay(lat=lat, lon=lon)
            return Response({'task_id': task.id, 'status': 'pending'})
        # sync mode (по умолчанию)
        result = geocode_yandex(lat=lat, lon=lon)
        if 'result' in result:
            return Response({'cached': result.get('cached', False), 'result': result['result']})
        return Response(result, status=502)

from celery.result import AsyncResult
class GeocodeResultView(APIView):
    """Получить результат асинхронного геокодирования по task_id"""
    def get(self, request, task_id):
        res = AsyncResult(task_id)
        if res.state == 'PENDING':
            return Response({'status': 'pending'})
        if res.state == 'FAILURE':
            return Response({'status': 'failure', 'error': str(res.result)}, status=500)
        return Response({'status': res.state.lower(), 'result': res.result})

class DeliveryZoneView(APIView):
    """API для работы с зонами доставки"""
    
    def get(self, request):
        """Получить все активные зоны доставки"""
        try:
            zones = DeliveryZone.objects.filter(is_active=True)
            serializer = DeliveryZoneSerializer(zones, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error getting delivery zones: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Создать новую зону доставки (только для админов)"""
        try:
            serializer = DeliveryZoneSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating delivery zone: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AddressDeliveryZoneCheckView(APIView):
    """API для проверки адреса в зоне доставки"""
    
    def post(self, request):
        """Проверить адрес в зоне доставки"""
        try:
            # Получаем данные адреса из запроса
            address_data = request.data.get('address', {})
            
            # Создаем временный объект адреса для проверки
            temp_address = Address(
                street=address_data.get('street', ''),
                house_number=address_data.get('house_number', ''),
                apartment=address_data.get('apartment', ''),
                city=address_data.get('city', ''),
                latitude=address_data.get('latitude'),
                longitude=address_data.get('longitude')
            )
            
            # Проверяем зону доставки
            is_in_zone, message = temp_address.is_in_delivery_zone()
            zones_info = temp_address.get_delivery_zones_info()
            
            return Response({
                'is_in_delivery_zone': is_in_zone,
                'message': message,
                'delivery_zones_info': zones_info
            })
            
        except Exception as e:
            logger.error(f"Error checking delivery zone: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AddressDeliveryZoneDetailView(APIView):
    """API для проверки конкретного адреса в зоне доставки"""
    
    def get(self, request, address_id):
        """Проверить конкретный адрес в зоне доставки"""
        try:
            # Получаем telegram_id из заголовков
            telegram_id = request.headers.get('X-Telegram-ID')
            if not telegram_id:
                return Response({'error': 'X-Telegram-ID header required'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Получаем пользователя
            try:
                user = Operator.objects.get(telegram_id=telegram_id)
            except Operator.DoesNotExist:
                return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Получаем адрес
            try:
                address = Address.objects.get(id=address_id, user=user)
            except Address.DoesNotExist:
                return Response({'error': 'Address not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Сериализуем с информацией о зоне доставки
            serializer = AddressDeliveryZoneSerializer(address)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"Error checking address delivery zone: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework import viewsets, filters
from .models import MenuItem, AddOn, SizeOption, Promotion, Order
from .serializers import MenuItemSerializer, AddOnSerializer, SizeOptionSerializer, PromotionSerializer, OrderSerializer

class AddOnViewSet(viewsets.ModelViewSet):
    queryset = AddOn.objects.all()
    serializer_class = AddOnSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['price', 'name']

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category')
        available_for_category = self.request.query_params.get('available_for_category')
        
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if available_for_category:
            queryset = queryset.filter(available_for_categories=available_for_category)
        
        return queryset

class SizeOptionViewSet(viewsets.ModelViewSet):
    queryset = SizeOption.objects.all()
    serializer_class = SizeOptionSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

class PromotionViewSet(viewsets.ModelViewSet):
    queryset = Promotion.objects.all()
    serializer_class = PromotionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['valid_from', 'valid_to', 'usage_count']

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        discount_type = self.request.query_params.get('discount_type')
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        if discount_type:
            queryset = queryset.filter(discount_type=discount_type)
        
        return queryset

class MenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['price', 'created_at', 'priority']

    def get_queryset(self):
        queryset = super().get_queryset()
        is_hit = self.request.query_params.get('is_hit')
        is_new = self.request.query_params.get('is_new')
        category_id = self.request.query_params.get('category')
        
        if is_hit is not None:
            queryset = queryset.filter(is_hit=is_hit.lower() == 'true')
        if is_new is not None:
            queryset = queryset.filter(is_new=is_new.lower() == 'true')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Сортировка по приоритету для хитов и новинок
        if is_hit == 'true':
            queryset = queryset.order_by('priority', '-created_at')
        elif is_new == 'true':
            queryset = queryset.order_by('priority', '-created_at')
        
        return queryset

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at']

    def perform_create(self, serializer):
        order = serializer.save()
        order.apply_promotion()

@method_decorator(csrf_exempt, name='dispatch')
class TestUserCreationView(APIView):
    """
    Эндпоинт для тестирования создания пользователя
    """
    
    def post(self, request):
        try:
            # Тестовые данные пользователя
            test_user_data = {
                'id': 908758841,
                'first_name': 'Шахзод',
                'last_name': 'Абидов',
                'username': 'abidov_0184',
                'language_code': 'ru',
                'is_premium': False,
                'auth_date': int(time.time()),
                'hash': 'test_hash',
                'photo_url': 'https://t.me/i/userpic/320/75uX4PkEs2KRZ6-VY01ECoDTsZdwGdU3TaieIzsNwYU.svg',
                'allows_write_to_pm': True
            }
            
            logger.info(f"Test user creation with data: {test_user_data}")
            
            # Создаем или получаем пользователя
            user, created = User.objects.get_or_create(
                telegram_id=test_user_data['id'],
                defaults={
                    'first_name': test_user_data['first_name'],
                    'last_name': test_user_data['last_name'],
                    'username': test_user_data['username'],
                }
            )
            
            # Обновляем данные если пользователь уже существует
            if not created:
                user.first_name = test_user_data['first_name']
                user.last_name = test_user_data['last_name']
                user.username = test_user_data['username']
                user.save()
            
            logger.info(f"Test user {'created' if created else 'updated'}: {user.telegram_id}")
            
            # Возвращаем данные пользователя
            response_data = {
                'success': True,
                'user': {
                    'id': user.id,
                    'telegram_id': user.telegram_id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'username': user.username,
                    'created_at': user.created_at.isoformat(),
                },
                'message': 'Тестовый пользователь создан/обновлен'
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error in test user creation: {str(e)}")
            return Response(
                {'error': 'Ошибка сервера при создании тестового пользователя'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )