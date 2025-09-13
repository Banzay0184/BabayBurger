from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Avg, Q, F
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger('api')

from .models import DeliveryDriver, DeliveryAssignment, Order
from .delivery_serializers import (
    DeliveryDriverSerializer, DeliveryDriverCreateSerializer,
    DeliveryAssignmentSerializer, DeliveryAssignmentCreateSerializer,
    DeliveryStatsSerializer, OrderForDeliverySerializer
)


class DeliveryDriverListCreateView(generics.ListCreateAPIView):
    """API для получения списка курьеров и создания нового курьера"""
    queryset = DeliveryDriver.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DeliveryDriverCreateSerializer
        return DeliveryDriverSerializer
    
    def get_queryset(self):
        queryset = DeliveryDriver.objects.all()
        
        # Фильтрация по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Фильтрация по активности
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.order_by('-created_at')


class DeliveryDriverDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API для получения, обновления и удаления курьера"""
    queryset = DeliveryDriver.objects.all()
    serializer_class = DeliveryDriverSerializer
    permission_classes = [IsAuthenticated]


class DeliveryAssignmentListCreateView(generics.ListCreateAPIView):
    """API для получения списка назначений и создания нового назначения"""
    queryset = DeliveryAssignment.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DeliveryAssignmentCreateSerializer
        return DeliveryAssignmentSerializer
    
    def get_queryset(self):
        queryset = DeliveryAssignment.objects.select_related('order', 'driver', 'driver__user')
        
        # Фильтрация по курьеру
        driver_id = self.request.query_params.get('driver_id')
        if driver_id:
            queryset = queryset.filter(driver_id=driver_id)
        
        # Фильтрация по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Фильтрация по заказу
        order_id = self.request.query_params.get('order_id')
        if order_id:
            queryset = queryset.filter(order_id=order_id)
        
        return queryset.order_by('-assigned_at')


class DeliveryAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API для получения, обновления и удаления назначения"""
    queryset = DeliveryAssignment.objects.all()
    serializer_class = DeliveryAssignmentSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def delivery_stats(request):
    """API для получения статистики доставки"""
    # Статистика курьеров
    total_drivers = DeliveryDriver.objects.count()
    active_drivers = DeliveryDriver.objects.filter(status='active').count()
    busy_drivers = DeliveryDriver.objects.filter(status='busy').count()
    offline_drivers = DeliveryDriver.objects.filter(status='offline').count()
    
    # Статистика назначений
    total_assignments = DeliveryAssignment.objects.count()
    pending_assignments = DeliveryAssignment.objects.filter(
        status__in=['assigned', 'accepted', 'picked_up', 'delivering']
    ).count()
    completed_assignments = DeliveryAssignment.objects.filter(status='delivered').count()
    cancelled_assignments = DeliveryAssignment.objects.filter(status='cancelled').count()
    
    # Средний рейтинг
    average_rating = DeliveryDriver.objects.aggregate(
        avg_rating=Avg('rating')
    )['avg_rating'] or 0
    
    stats_data = {
        'total_drivers': total_drivers,
        'active_drivers': active_drivers,
        'busy_drivers': busy_drivers,
        'offline_drivers': offline_drivers,
        'total_assignments': total_assignments,
        'pending_assignments': pending_assignments,
        'completed_assignments': completed_assignments,
        'cancelled_assignments': cancelled_assignments,
        'average_rating': round(average_rating, 2)
    }
    
    serializer = DeliveryStatsSerializer(stats_data)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_orders(request):
    """API для получения доступных заказов на доставку"""
    # Заказы на доставку, которые еще не назначены курьерам
    assigned_order_ids = DeliveryAssignment.objects.filter(
        status__in=['assigned', 'accepted', 'picked_up', 'delivering']
    ).values_list('order_id', flat=True)
    
    orders = Order.objects.filter(
        service_type='delivery',
        status__in=['preparing', 'ready_for_delivery']
    ).exclude(id__in=assigned_order_ids).order_by('-created_at')
    
    serializer = OrderForDeliverySerializer(orders, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_drivers(request):
    """API для получения доступных курьеров"""
    drivers = DeliveryDriver.objects.filter(
        is_active=True,
        status__in=['active', 'busy'],
        current_orders_count__lt=F('max_orders')
    ).order_by('current_orders_count', 'rating')
    
    serializer = DeliveryDriverSerializer(drivers, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_order_to_driver(request):
    """API для назначения заказа курьеру"""
    order_id = request.data.get('order_id')
    driver_id = request.data.get('driver_id')
    notes = request.data.get('notes', '')
    
    if not order_id or not driver_id:
        return Response(
            {'error': 'Требуются order_id и driver_id'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        order = Order.objects.get(id=order_id)
        driver = DeliveryDriver.objects.get(id=driver_id)
        
        # Проверяем, что заказ на доставку
        if order.service_type != 'delivery':
            return Response(
                {'error': 'Можно назначать только заказы на доставку'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что курьер может взять заказ
        if not driver.can_take_order():
            return Response(
                {'error': 'Курьер не может взять больше заказов'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что заказ еще не назначен
        if DeliveryAssignment.objects.filter(
            order=order,
            status__in=['assigned', 'accepted', 'picked_up', 'delivering']
        ).exists():
            return Response(
                {'error': 'Заказ уже назначен курьеру'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем назначение
        assignment = DeliveryAssignment.objects.create(
            order=order,
            driver=driver,
            notes=notes
        )
        
        serializer = DeliveryAssignmentSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Заказ не найден'},
            status=status.HTTP_404_NOT_FOUND
        )
    except DeliveryDriver.DoesNotExist:
        return Response(
            {'error': 'Курьер не найден'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_assignment_status(request, assignment_id):
    """API для обновления статуса назначения"""
    action = request.data.get('action')
    
    if not action:
        return Response(
            {'error': 'Требуется параметр action'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        assignment = DeliveryAssignment.objects.get(id=assignment_id)
        
        success = False
        message = ""
        
        if action == 'accept':
            success = assignment.accept()
            message = "Заказ принят"
        elif action == 'pickup':
            success = assignment.pick_up()
            message = "Заказ отмечен как забранный"
        elif action == 'delivering':
            success = assignment.start_delivery()
            message = "Заказ отмечен как доставляется"
        elif action == 'delivered':
            success = assignment.complete_delivery()
            message = "Заказ отмечен как доставленный"
        elif action == 'cancel':
            success = assignment.cancel()
            message = "Заказ отменен"
        else:
            return Response(
                {'error': 'Неизвестное действие'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if success:
            serializer = DeliveryAssignmentSerializer(assignment)
            return Response({
                'message': message,
                'assignment': serializer.data
            })
        else:
            return Response(
                {'error': 'Нельзя выполнить это действие в текущем статусе заказа'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except DeliveryAssignment.DoesNotExist:
        return Response(
            {'error': 'Назначение не найдено'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_driver_status(request, driver_id):
    """API для обновления статуса курьера"""
    new_status = request.data.get('status')
    
    if not new_status:
        return Response(
            {'error': 'Требуется параметр status'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    valid_statuses = ['active', 'busy', 'offline', 'blocked']
    if new_status not in valid_statuses:
        return Response(
            {'error': f'Статус должен быть одним из: {", ".join(valid_statuses)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        driver = DeliveryDriver.objects.get(id=driver_id)
        driver.update_status(new_status)
        
        serializer = DeliveryDriverSerializer(driver)
        return Response({
            'message': f'Статус курьера изменен на {driver.get_status_display()}',
            'driver': serializer.data
        })
        
    except DeliveryDriver.DoesNotExist:
        return Response(
            {'error': 'Курьер не найден'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def driver_assignments(request, driver_id):
    """API для получения назначений конкретного курьера"""
    try:
        driver = DeliveryDriver.objects.get(id=driver_id)
        assignments = DeliveryAssignment.objects.filter(driver=driver).order_by('-assigned_at')
        
        serializer = DeliveryAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)
        
    except DeliveryDriver.DoesNotExist:
        return Response(
            {'error': 'Курьер не найден'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def order_assignments(request, order_id):
    """API для получения назначений конкретного заказа"""
    try:
        order = Order.objects.get(id=order_id)
        assignments = DeliveryAssignment.objects.filter(order=order).order_by('-assigned_at')
        
        serializer = DeliveryAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)
        
    except Order.DoesNotExist:
        return Response(
            {'error': 'Заказ не найден'},
            status=status.HTTP_404_NOT_FOUND
        )


class DeliveryWebhookView(APIView):
    """Webhook для бота доставщиков"""
    
    def post(self, request):
        try:
            # Проверяем наличие данных
            if not request.data:
                logger.warning("Delivery webhook received empty data")
                return Response({'error': 'Empty request data'}, status=status.HTTP_400_BAD_REQUEST)
            
            update = request.data
            
            # Проверяем структуру данных
            if not isinstance(update, dict):
                logger.warning(f"Delivery webhook received invalid data type: {type(update)}")
                return Response({'error': 'Invalid data format'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Безопасное извлечение данных с проверками
            message = update.get('message')
            
            if message:
                # Обработка текстовых сообщений
                text = message.get('text', '')
                chat_id = message.get('chat', {}).get('id')
                user_info = message.get('from', {})
                
                logger.info(f"Delivery webhook received message: {text} from chat {chat_id}")
                
                # Обработка команды /start
                if text == '/start':
                    return self.handle_start_command(chat_id, user_info)
                
                # Обработка других команд
                elif text.startswith('/'):
                    return self.handle_command(text, chat_id, user_info)
                
                # Обработка обычных сообщений
                else:
                    return self.handle_message(text, chat_id, user_info)
            
            # Обработка callback_query
            elif update.get('callback_query'):
                callback_query = update['callback_query']
                return self.handle_callback_query(callback_query)
            
            else:
                logger.warning(f"Delivery webhook received unknown update type: {update}")
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error in delivery webhook: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_start_command(self, chat_id, user_info):
        """Обработка команды /start для доставщиков"""
        try:
            from api.models import User, DeliveryDriver
            from api.telegram_fallback import telegram_fallback
            
            # Получаем или создаем пользователя
            telegram_id = user_info.get('id')
            username = user_info.get('username', '')
            first_name = user_info.get('first_name', '')
            last_name = user_info.get('last_name', '')
            
            if not telegram_id:
                logger.error("No telegram_id in user info")
                return Response({'error': 'Invalid user data'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Создаем или обновляем пользователя
            user, created = User.objects.get_or_create(
                telegram_id=telegram_id,
                defaults={
                    'username': username,
                    'first_name': first_name,
                    'last_name': last_name
                }
            )
            
            if not created:
                # Обновляем данные пользователя
                user.username = username
                user.first_name = first_name
                user.last_name = last_name
                user.save()
            
            # Проверяем, является ли пользователь курьером
            try:
                driver = DeliveryDriver.objects.get(user=user)
                driver_status = driver.status
                is_active = driver.is_active
            except DeliveryDriver.DoesNotExist:
                driver_status = "not_registered"
                is_active = False
            
            # Формируем ответное сообщение
            if driver_status == "not_registered":
                welcome_text = (
                    "🚚 Добро пожаловать в Babay Food Delivery!\n\n"
                    "Вы не зарегистрированы как курьер.\n"
                    "Обратитесь к администратору для регистрации."
                )
            elif not is_active:
                welcome_text = (
                    "🚚 Добро пожаловать в Babay Food Delivery!\n\n"
                    "Ваш аккаунт курьера неактивен.\n"
                    "Обратитесь к администратору для активации."
                )
            else:
                welcome_text = (
                    "🚚 Добро пожаловать в Babay Food Delivery!\n\n"
                    f"Статус: {driver_status}\n"
                    "Вы готовы принимать заказы на доставку!\n\n"
                    "Доступные команды:\n"
                    "/status - проверить статус\n"
                    "/orders - мои заказы\n"
                    "/help - помощь"
                )
            
            # Отправляем сообщение через резервный механизм
            result = telegram_fallback.send_message(
                chat_id=chat_id,
                text=welcome_text,
                parse_mode="HTML"
            )
            
            if result['success']:
                logger.info(f"Start command processed successfully for delivery driver {chat_id}")
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            else:
                logger.error(f"Failed to send start message: {result.get('error')}")
                return Response({'error': 'Failed to send message'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error handling start command: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_command(self, text, chat_id, user_info):
        """Обработка команд"""
        try:
            from api.telegram_fallback import telegram_fallback
            
            if text == '/status':
                # Проверяем статус курьера
                from api.models import User, DeliveryDriver
                telegram_id = user_info.get('id')
                
                try:
                    user = User.objects.get(telegram_id=telegram_id)
                    driver = DeliveryDriver.objects.get(user=user)
                    
                    status_text = (
                        f"🚚 Статус курьера:\n\n"
                        f"Имя: {driver.user.first_name}\n"
                        f"Статус: {driver.status}\n"
                        f"Активен: {'Да' if driver.is_active else 'Нет'}\n"
                        f"Текущих заказов: {driver.current_orders_count}\n"
                        f"Максимум заказов: {driver.max_orders}\n"
                        f"Рейтинг: {driver.rating:.1f}/5.0"
                    )
                except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                    status_text = "❌ Вы не зарегистрированы как курьер."
                
                result = telegram_fallback.send_message(chat_id, status_text)
                
            elif text == '/orders':
                # Показываем текущие заказы
                from api.models import User, DeliveryDriver, DeliveryAssignment
                telegram_id = user_info.get('id')
                
                try:
                    user = User.objects.get(telegram_id=telegram_id)
                    driver = DeliveryDriver.objects.get(user=user)
                    
                    assignments = DeliveryAssignment.objects.filter(
                        driver=driver,
                        status__in=['assigned', 'picked_up', 'in_transit']
                    ).order_by('-assigned_at')[:5]
                    
                    if assignments:
                        orders_text = "📦 Ваши текущие заказы:\n\n"
                        for assignment in assignments:
                            order = assignment.order
                            orders_text += (
                                f"Заказ #{order.id}\n"
                                f"Статус: {assignment.status}\n"
                                f"Адрес: {order.delivery_address}\n"
                                f"Сумма: {order.total_amount} сум\n\n"
                            )
                    else:
                        orders_text = "📦 У вас нет активных заказов."
                        
                except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                    orders_text = "❌ Вы не зарегистрированы как курьер."
                
                result = telegram_fallback.send_message(chat_id, orders_text)
                
            elif text == '/help':
                help_text = (
                    "🚚 Помощь по командам:\n\n"
                    "/start - начать работу\n"
                    "/status - проверить статус\n"
                    "/orders - мои заказы\n"
                    "/help - эта справка"
                )
                result = telegram_fallback.send_message(chat_id, help_text)
                
            else:
                result = telegram_fallback.send_message(
                    chat_id, 
                    "❓ Неизвестная команда. Используйте /help для справки."
                )
            
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error handling command: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_message(self, text, chat_id, user_info):
        """Обработка обычных сообщений"""
        try:
            from api.telegram_fallback import telegram_fallback
            
            # Простой ответ на обычные сообщения
            response_text = (
                "🚚 Спасибо за сообщение!\n\n"
                "Используйте команды для взаимодействия с ботом:\n"
                "/start - начать работу\n"
                "/status - проверить статус\n"
                "/orders - мои заказы\n"
                "/help - справка"
            )
            
            result = telegram_fallback.send_message(chat_id, response_text)
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_callback_query(self, callback_query):
        """Обработка callback_query"""
        try:
            # Пока что просто отвечаем на callback
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error handling callback query: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
