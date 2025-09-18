from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import authenticate, logout
from django.contrib.auth.models import update_last_login
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime
import logging

from .models import Cashier, OrderProcessing, CashierNotification, CashierToken
from .serializers import (
    CashierRegistrationSerializer, CashierLoginSerializer, 
    CashierProfileSerializer, OrderForCashierSerializer
)
from .authentication import CashierTokenAuthentication
from api.models import Order, MenuItem, Category, AddOn, SizeOption
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)

def send_menu_update_notification(menu_item, action):
    """Отправляет WebSocket уведомление об изменении меню"""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            # Проверяем доступность товара по времени
            try:
                is_available_now = menu_item.is_available_now()
                availability_status = menu_item.get_availability_status()
            except Exception as e:
                logger.error(f"Error checking availability: {str(e)}")
                is_available_now = True  # По умолчанию доступен
                availability_status = "Доступен всегда"
            
            async_to_sync(channel_layer.group_send)(
                'menu_updates',
                {
                    'type': 'menu_item_updated',
                    'item_id': menu_item.id,
                    'item_name': menu_item.name,
                    'is_active': menu_item.is_active,
                    'is_available_now': is_available_now,
                    'availability_status': availability_status,
                    'use_time_restriction': menu_item.use_time_restriction,
                    'available_from_time': str(menu_item.available_from_time) if menu_item.available_from_time else None,
                    'available_to_time': str(menu_item.available_to_time) if menu_item.available_to_time else None,
                    'action': action,
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.info(f"📡 Menu update notification sent: {menu_item.name} - {action} (available_now: {is_available_now})")
    except Exception as e:
        logger.error(f"Error sending menu update notification: {str(e)}")

class CashierAuthViewSet(viewsets.ViewSet):
    """ViewSet для аутентификации кассиров"""
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Регистрация нового кассира"""
        serializer = CashierRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            cashier = serializer.save()
            token, created = CashierToken.objects.get_or_create(cashier=cashier)
            return Response({
                'message': 'Кассир успешно зарегистрирован',
                'token': token.key,
                'cashier': CashierProfileSerializer(cashier).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """Вход кассира"""
        serializer = CashierLoginSerializer(data=request.data)
        if serializer.is_valid():
            cashier = serializer.validated_data['cashier']
            token, created = CashierToken.objects.get_or_create(cashier=cashier)
            update_last_login(None, cashier)
            return Response({
                'message': 'Успешный вход',
                'token': token.key,
                'cashier': CashierProfileSerializer(cashier).data
            }, status=status.HTTP_200_OK)
        logger.warning("Cashier login failed: payload=%s errors=%s", dict(request.data), serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CashierOrderViewSet(viewsets.ModelViewSet):
    """ViewSet для работы кассиров с заказами"""
    serializer_class = OrderForCashierSerializer
    authentication_classes = [CashierTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    
    def get_queryset(self):
        """Получение заказов для кассира"""
        cashier = self.request.user
        return Order.objects.filter(
            restaurant=cashier.restaurant
        ).select_related(
            'user', 'address', 'restaurant'
        ).prefetch_related(
            'orderitem_set__menu_item',
            'cashier_processing'
        ).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Дашборд кассира"""
        cashier = request.user
        restaurant_orders = Order.objects.filter(restaurant=cashier.restaurant)
        
        dashboard_data = {
            'total_orders': restaurant_orders.count(),
            'preparing_orders': restaurant_orders.filter(status='preparing').count(),
            'ready_orders': restaurant_orders.filter(status='ready_for_delivery').count(),
            'delivering_orders': restaurant_orders.filter(status='on_delivery').count(),
            'completed_orders': restaurant_orders.filter(status='completed').count(),
            'restaurant_name': cashier.restaurant.name,
        }
        return Response(dashboard_data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Поиск заказов по телефону, номеру заказа или номеру очереди"""
        cashier = request.user
        query = request.GET.get('q', '').strip()
        
        if not query:
            return Response({'error': 'Параметр поиска не указан'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Базовый queryset для ресторана кассира
        base_queryset = Order.objects.filter(restaurant=cashier.restaurant)
        
        from django.db.models import Q
        
        # Определяем тип поиска и выполняем соответствующий запрос
        if query.isdigit():
            # Если запрос состоит только из цифр, ищем точное совпадение по ID заказа
            order_id = int(query)
            all_orders = base_queryset.filter(id=order_id)
        else:
            # Если запрос не только цифры, ищем по телефону и номеру очереди
            all_orders = base_queryset.filter(
                Q(operator_order_number__icontains=query) |
                Q(phone__icontains=query)
            )
        
        # Применяем select_related и prefetch_related
        all_orders = all_orders.select_related(
            'user', 'address', 'restaurant'
        ).prefetch_related(
            'orderitem_set__menu_item',
            'cashier_processing'
        ).order_by('-created_at')
        
        # Сериализуем результаты
        serializer = OrderForCashierSerializer(all_orders, many=True)
        
        return Response({
            'orders': serializer.data,
            'query': query,
            'count': all_orders.count()
        })
    
    @action(detail=True, methods=['post'])
    def start_processing(self, request, pk=None):
        """Начать обработку заказа"""
        order = get_object_or_404(Order, pk=pk)
        cashier = request.user
        
        can_handle, message = cashier.can_handle_order(order)
        if not can_handle:
            return Response({'error': message}, status=status.HTTP_403_FORBIDDEN)
        
        processing, created = OrderProcessing.objects.get_or_create(
            order=order,
            defaults={'cashier': cashier, 'status': 'received'}
        )
        
        processing.start_preparing()
        order.status = 'preparing'
        order.save()
        
        return Response({
            'message': 'Обработка заказа начата',
            'order': OrderForCashierSerializer(order).data
        })
    
    @action(detail=True, methods=['post'])
    def mark_ready(self, request, pk=None):
        """Отметить заказ как готовый"""
        order = get_object_or_404(Order, pk=pk)
        cashier = request.user
        
        # Проверяем, может ли кассир обработать этот заказ
        can_handle, message = cashier.can_handle_order(order)
        if not can_handle:
            return Response({'error': message}, status=status.HTTP_403_FORBIDDEN)
        
        # Получаем или создаем OrderProcessing
        processing, created = OrderProcessing.objects.get_or_create(
            order=order,
            defaults={
                'cashier': cashier,
                'status': 'preparing',
                'started_preparing_at': timezone.now(),
                'notes': 'Автоматически создано при отметке готовности'
            }
        )
        
        # Если запись была создана, логируем это
        if created:
            logger.info(f"🆕 Created OrderProcessing for order #{order.id} and cashier {cashier.id}")
        
        # Отмечаем заказ как готовый
        processing.mark_ready()
        order.status = 'ready_for_delivery'
        order.save()
        
        return Response({'message': 'Заказ отмечен как готовый'})
    
    @action(detail=True, methods=['post'])
    def mark_delivering(self, request, pk=None):
        """Отметить заказ как отправленный на доставку"""
        order = get_object_or_404(Order, pk=pk)
        cashier = request.user
        
        # Проверяем, может ли кассир обработать этот заказ
        can_handle, message = cashier.can_handle_order(order)
        if not can_handle:
            return Response({'error': message}, status=status.HTTP_403_FORBIDDEN)
        
        # Получаем или создаем OrderProcessing
        processing, created = OrderProcessing.objects.get_or_create(
            order=order,
            defaults={
                'cashier': cashier,
                'status': 'ready',
                'ready_at': timezone.now(),
                'notes': 'Автоматически создано при отправке на доставку'
            }
        )
        
        # Если запись была создана, логируем это
        if created:
            logger.info(f"🆕 Created OrderProcessing for order #{order.id} and cashier {cashier.id}")
        
        # Отмечаем заказ как отправленный на доставку
        processing.mark_delivering()
        order.status = 'delivering'
        order.save()
        
        return Response({'message': 'Заказ отправлен на доставку'})
    
    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Завершить обработку заказа"""
        order = get_object_or_404(Order, pk=pk)
        cashier = request.user
        
        # Проверяем, может ли кассир обработать этот заказ
        can_handle, message = cashier.can_handle_order(order)
        if not can_handle:
            return Response({'error': message}, status=status.HTTP_403_FORBIDDEN)
        
        # Получаем или создаем OrderProcessing
        processing, created = OrderProcessing.objects.get_or_create(
            order=order,
            defaults={
                'cashier': cashier,
                'status': 'delivering',
                'notes': 'Автоматически создано при завершении заказа'
            }
        )
        
        # Если запись была создана, логируем это
        if created:
            logger.info(f"🆕 Created OrderProcessing for order #{order.id} and cashier {cashier.id}")
        
        # Завершаем обработку заказа
        processing.complete()
        order.status = 'completed'
        order.save()
        cashier.processed_orders_count += 1
        cashier.save()
        
        # Логируем завершение заказа
        logger.info(f"✅ Order #{order.id} completed by cashier {cashier.id} (service_type: {order.service_type})")
        
        return Response({'message': 'Заказ завершен'})


class CashierStopListViewSet(viewsets.ViewSet):
    """ViewSet для управления стоп-листом кассиром"""
    authentication_classes = [CashierTokenAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def menu(self, request):
        """Получение меню ресторана для стоп-листа"""
        cashier = request.user
        restaurant = cashier.restaurant
        
        # Получаем все категории с товарами
        categories = Category.objects.all()
        categories_data = []
        
        for category in categories:
            items = MenuItem.objects.filter(category=category).order_by('priority', '-created_at')
            items_data = []
            
            for item in items:
                items_data.append({
                    'id': item.id,
                    'name': item.name,
                    'description': item.description,
                    'price': float(item.price),
                    'image': item.image.url if item.image else None,
                    'is_active': item.is_active,
                    'is_hit': item.is_hit,
                    'is_new': item.is_new,
                    'priority': item.priority
                })
            
            categories_data.append({
                'id': category.id,
                'name': category.name,
                'description': category.description,
                'image': category.image.url if category.image else None,
                'items': items_data,
                'item_count': len(items)
            })
        
        return Response({
            'categories': categories_data,
            'restaurant_name': restaurant.name
        })
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Переключение статуса товара (активен/неактивен)"""
        try:
            menu_item = get_object_or_404(MenuItem, pk=pk)
            cashier = request.user
            
            # Переключаем статус
            menu_item.is_active = not menu_item.is_active
            menu_item.save()
            
            action = "деактивирован" if not menu_item.is_active else "активирован"
            logger.info(f"🍽️ Menu item '{menu_item.name}' {action} by cashier {cashier.id}")
            
            # Отправляем WebSocket уведомление клиентам
            send_menu_update_notification(menu_item, action)
            
            return Response({
                'message': f'Товар "{menu_item.name}" {action}',
                'item': {
                    'id': menu_item.id,
                    'name': menu_item.name,
                    'is_active': menu_item.is_active
                }
            })
            
        except Exception as e:
            logger.error(f"Error toggling menu item status: {str(e)}")
            return Response(
                {'error': 'Ошибка при изменении статуса товара'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def inactive_items(self, request):
        """Получение списка деактивированных товаров"""
        cashier = request.user
        
        inactive_items = MenuItem.objects.filter(is_active=False).select_related('category')
        items_data = []
        
        for item in inactive_items:
            items_data.append({
                'id': item.id,
                'name': item.name,
                'description': item.description,
                'price': float(item.price),
                'image': item.image.url if item.image else None,
                'category_name': item.category.name,
                'is_hit': item.is_hit,
                'is_new': item.is_new,
                'priority': item.priority
            })
        
        return Response({
            'inactive_items': items_data,
            'count': len(items_data)
        })
    
    @action(detail=False, methods=['get'])
    def addons(self, request):
        """Получение всех дополнений для управления"""
        cashier = request.user
        restaurant = cashier.restaurant
        
        # Получаем все дополнения
        addons = AddOn.objects.all().order_by('name')
        addons_data = []
        
        for addon in addons:
            addons_data.append({
                'id': addon.id,
                'name': addon.name,
                'price': float(addon.price),
                'categories': [
                    {'id': cat.id, 'name': cat.name} 
                    for cat in addon.available_for_categories.all()
                ],
                'is_active': addon.is_active,
                'created_at': addon.created_at
            })
        
        return Response({
            'addons': addons_data,
            'restaurant_name': restaurant.name
        })
    
    @action(detail=True, methods=['post'])
    def toggle_addon_status(self, request, pk=None):
        """Переключение статуса дополнения"""
        try:
            addon = AddOn.objects.get(id=pk)
            addon.is_active = not addon.is_active
            addon.save()
            
            return Response({
                'message': f'Дополнение "{addon.name}" {"активировано" if addon.is_active else "деактивировано"}',
                'addon': {
                    'id': addon.id,
                    'name': addon.name,
                    'is_active': addon.is_active
                }
            })
        except AddOn.DoesNotExist:
            return Response(
                {'error': 'Дополнение не найдено'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Ошибка изменения статуса: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def inactive_addons(self, request):
        """Получение списка деактивированных дополнений"""
        cashier = request.user
        
        inactive_addons = AddOn.objects.filter(is_active=False).select_related('category')
        addons_data = []
        
        for addon in inactive_addons:
            addons_data.append({
                'id': addon.id,
                'name': addon.name,
                'price': float(addon.price),
                'category': addon.category.name if addon.category else 'Без категории',
                'category_id': addon.category.id if addon.category else None,
                'available_for_categories': [
                    {'id': cat.id, 'name': cat.name} 
                    for cat in addon.available_for_categories.all()
                ],
                'created_at': addon.created_at
            })
        
        return Response({
            'inactive_addons': addons_data,
            'count': len(addons_data)
        })
    
    @action(detail=False, methods=['get'])
    def sizes(self, request):
        """Получение всех размеров для управления"""
        cashier = request.user
        restaurant = cashier.restaurant
        
        # Получаем все размеры
        sizes = SizeOption.objects.all().order_by('name')
        sizes_data = []
        
        for size in sizes:
            sizes_data.append({
                'id': size.id,
                'name': size.name,
                'price_modifier': float(size.price_modifier),
                'is_active': size.is_active,
                'created_at': size.created_at
            })
        
        return Response({
            'sizes': sizes_data,
            'restaurant_name': restaurant.name
        })
    
    @action(detail=True, methods=['post'])
    def toggle_size_status(self, request, pk=None):
        """Переключение статуса размера"""
        try:
            size = SizeOption.objects.get(id=pk)
            size.is_active = not size.is_active
            size.save()
            
            return Response({
                'message': f'Размер "{size.name}" {"активирован" if size.is_active else "деактивирован"}',
                'size': {
                    'id': size.id,
                    'name': size.name,
                    'is_active': size.is_active
                }
            })
        except SizeOption.DoesNotExist:
            return Response(
                {'error': 'Размер не найден'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Ошибка изменения статуса: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )