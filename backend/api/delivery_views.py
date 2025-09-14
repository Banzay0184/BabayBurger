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
            
            # Обработка фотографий
            elif message and message.get('photo'):
                photo_info = message.get('photo', [])
                chat_id = message.get('chat', {}).get('id')
                user_info = message.get('from', {})
                return self.handle_photo_message(chat_id, user_info, photo_info)
            
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
                    "Доступные функции:\n"
                    "📦 Мои заказы - просмотр активных заказов\n"
                    "🗺️ Маршрут - маршрут доставки с кнопками процесса\n"
                    "📊 Статус - статус курьера\n"
                    "⚙️ Изменить статус - изменить статус курьера\n"
                    "❓ Помощь - справка\n\n"
                    "💡 Используйте кнопки внизу экрана!"
                )
            
            # Отправляем сообщение через бота доставщиков с Reply Keyboard
            result = self.send_delivery_message(
                chat_id=chat_id,
                text=welcome_text,
                parse_mode="HTML",
                reply_markup=self.get_delivery_keyboard()
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
            logger.info(f"Processing command: {text} from user {chat_id}")
            
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
                
                result = self.send_delivery_message(
                    chat_id, 
                    status_text,
                    reply_markup=self.get_delivery_keyboard()
                )
                logger.info(f"Status command processed for user {chat_id}")
                
            elif text == '/orders':
                # Показываем текущие заказы
                from api.models import User, DeliveryDriver, DeliveryAssignment
                telegram_id = user_info.get('id')
                
                try:
                    user = User.objects.get(telegram_id=telegram_id)
                    driver = DeliveryDriver.objects.get(user=user)
                    
                    assignments = DeliveryAssignment.objects.filter(
                        driver=driver,
                        status__in=['accepted', 'picked_up']
                    ).order_by('-assigned_at')[:5]
                    
                    if assignments:
                        orders_text = "📦 Ваши активные заказы:\n\n"
                        for assignment in assignments:
                            order = assignment.order
                            restaurant = order.restaurant
                            address = order.address
                            
                            status_emoji = {
                                'accepted': '✅',
                                'in_transit': '🚗',
                                'delivered': '🎉'
                            }.get(assignment.status, '❓')
                            
                            status_text = {
                                'accepted': 'Принят',
                                'picked_up': 'В пути',
                                'delivered': 'Доставлен'
                            }.get(assignment.status, assignment.status)
                            
                            orders_text += (
                                f"{status_emoji} Заказ #{order.id}\n"
                                f"   📍 От: {restaurant.name if restaurant else 'Не указан'}\n"
                                f"   📍 До: {address.street if address else 'Не указан'}, {address.house_number if address else ''}\n"
                                f"   📞 Клиент: {order.phone}\n"
                                f"   💰 Сумма: {order.final_price:,} сум\n"
                                f"   ⏰ Статус: {status_text}\n"
                                f"   📅 Назначен: {assignment.assigned_at.strftime('%H:%M %d.%m')}\n\n"
                            )
                    else:
                        orders_text = "📦 У вас нет активных заказов.\n\nПринимайте заказы через группу доставщиков!"
                        
                except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                    orders_text = "❌ Вы не зарегистрированы как курьер."
                
                result = self.send_delivery_message(
                    chat_id, 
                    orders_text,
                    reply_markup=self.get_delivery_keyboard()
                )
                logger.info(f"Orders command processed for user {chat_id}")
                
            elif text == '/route':
                # Показываем маршрут для текущих заказов
                from api.models import User, DeliveryDriver, DeliveryAssignment
                telegram_id = user_info.get('id')
                
                try:
                    user = User.objects.get(telegram_id=telegram_id)
                    driver = DeliveryDriver.objects.get(user=user)
                    
                    assignments = DeliveryAssignment.objects.filter(
                        driver=driver,
                        status__in=['accepted', 'picked_up']
                    ).order_by('-assigned_at')[:3]
                    
                    if assignments:
                        route_text = "🗺️ Ваш маршрут:\n\n"
                        for i, assignment in enumerate(assignments, 1):
                            order = assignment.order
                            restaurant = order.restaurant
                            address = order.address
                            
                            status_text = {
                                'accepted': 'Принят',
                                'picked_up': 'В пути',
                                'delivered': 'Доставлен'
                            }.get(assignment.status, assignment.status)
                            
                            route_text += (
                                f"{i}. Заказ #{order.id}\n"
                                f"   📍 От: {restaurant.name}\n"
                                f"   📍 До: {address.street}, {address.house_number}\n"
                                f"   📞 Клиент: {order.phone}\n"
                                f"   💰 Сумма: {order.final_price:,} сум\n"
                                f"   ⏰ Статус: {status_text}\n\n"
                            )
                        
                        # Создаем клавиатуру с кнопками
                        reply_markup = self.create_order_keyboard(assignments)
                        
                        result = self.send_delivery_message(
                            chat_id, 
                            route_text,
                            reply_markup=reply_markup
                        )
                        logger.info(f"Route command processed for user {chat_id}, {len(assignments)} orders")
                    else:
                        route_text = "🗺️ У вас нет активных заказов для маршрута.\n\nПринимайте заказы через группу доставщиков!"
                        result = self.send_delivery_message(
                            chat_id, 
                            route_text,
                            reply_markup=self.get_delivery_keyboard()
                        )
                        
                except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                    route_text = "❌ Вы не зарегистрированы как курьер."
                    result = self.send_delivery_message(
                        chat_id, 
                        route_text,
                        reply_markup=self.get_delivery_keyboard()
                    )
                
            elif text == '/map':
                # Показываем карты для всех активных заказов
                from api.models import User, DeliveryDriver, DeliveryAssignment
                telegram_id = user_info.get('id')
                
                try:
                    user = User.objects.get(telegram_id=telegram_id)
                    driver = DeliveryDriver.objects.get(user=user)
                    
                    assignments = DeliveryAssignment.objects.filter(
                        driver=driver,
                        status__in=['accepted', 'picked_up']
                    ).order_by('-assigned_at')[:3]
                    
                    if assignments:
                        map_text = "🗺️ Карты маршрутов:\n\n"
                        keyboard = []
                        
                        for assignment in assignments:
                            order = assignment.order
                            restaurant = order.restaurant
                            address = order.address
                            
                            status_text = {
                                'accepted': 'Принят',
                                'picked_up': 'В пути',
                                'delivered': 'Доставлен'
                            }.get(assignment.status, assignment.status)
                            
                            if restaurant and address and restaurant.latitude and restaurant.longitude and address.latitude and address.longitude:
                                route_url = f"https://yandex.ru/maps/?rtext={restaurant.latitude},{restaurant.longitude}~{address.latitude},{address.longitude}&rtt=auto"
                                map_text += f"📍 Заказ #{order.id} ({status_text}): {restaurant.name} → {address.street}\n"
                                keyboard.append([{
                                    'text': f'🗺️ Маршрут #{order.id}',
                                    'url': route_url
                                }])
                            else:
                                map_text += f"❌ Заказ #{order.id} ({status_text}): Нет координат для маршрута\n"
                        
                        # Создаем только inline keyboard для кнопок карт
                        reply_markup = {'inline_keyboard': keyboard} if keyboard else {}
                        
                        result = self.send_delivery_message(
                            chat_id, 
                            map_text,
                            reply_markup=reply_markup
                        )
                        logger.info(f"Map command processed for user {chat_id}, {len(assignments)} orders")
                    else:
                        map_text = "🗺️ У вас нет активных заказов для маршрутов.\n\nПринимайте заказы через группу доставщиков!"
                        result = self.send_delivery_message(
                            chat_id, 
                            map_text,
                            reply_markup=self.get_delivery_keyboard()
                        )
                        
                except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                    map_text = "❌ Вы не зарегистрированы как курьер."
                    result = self.send_delivery_message(
                        chat_id, 
                        map_text,
                        reply_markup=self.get_delivery_keyboard()
                    )
                
            elif text == '/change_status':
                # Показываем кнопки для изменения статуса курьера
                from api.models import User, DeliveryDriver
                telegram_id = user_info.get('id')
                
                try:
                    user = User.objects.get(telegram_id=telegram_id)
                    driver = DeliveryDriver.objects.get(user=user)
                    
                    status_text = (
                        f"⚙️ Изменение статуса курьера:\n\n"
                        f"Текущий статус: {driver.status}\n"
                        f"Активен: {'Да' if driver.is_active else 'Нет'}\n\n"
                        f"Выберите новый статус:"
                    )
                    
                    # Создаем inline keyboard для выбора статуса
                    keyboard = [
                        [{'text': '🟢 Активный', 'callback_data': f'change_driver_status_active_{driver.id}'}],
                        [{'text': '🟡 Занят', 'callback_data': f'change_driver_status_busy_{driver.id}'}],
                        [{'text': '🔴 Не в сети', 'callback_data': f'change_driver_status_offline_{driver.id}'}]
                    ]
                    
                    reply_markup = {'inline_keyboard': keyboard}
                    
                    result = self.send_delivery_message(
                        chat_id, 
                        status_text,
                        reply_markup=reply_markup
                    )
                    
                except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                    status_text = "❌ Вы не зарегистрированы как курьер."
                    result = self.send_delivery_message(
                        chat_id, 
                        status_text,
                        reply_markup=self.get_delivery_keyboard()
                    )
                
            elif text == '/help':
                help_text = (
                    "🚚 Помощь по кнопкам:\n\n"
                    "📦 Мои заказы - просмотр активных заказов\n"
                    "🗺️ Маршрут - маршрут доставки с кнопками процесса\n"
                    "📊 Статус - статус курьера\n"
                    "⚙️ Изменить статус - изменить статус курьера\n"
                    "❓ Помощь - эта справка\n\n"
                    "💡 Используйте кнопки внизу экрана для удобства!"
                )
                result = self.send_delivery_message(
                    chat_id, 
                    help_text,
                    reply_markup=self.get_delivery_keyboard()
                )
                
            else:
                result = self.send_delivery_message(
                    chat_id, 
                    "❓ Неизвестная команда. Используйте кнопки внизу экрана или /help для справки.",
                    reply_markup=self.get_delivery_keyboard()
                )
            
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error handling command: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_message(self, text, chat_id, user_info):
        """Обработка обычных сообщений и кнопок Reply Keyboard"""
        try:
            from api.telegram_fallback import telegram_fallback
            
            # Обрабатываем кнопки Reply Keyboard
            if text == "📦 Мои заказы":
                return self.handle_command("/orders", chat_id, user_info)
            elif text == "🗺️ Маршрут":
                return self.handle_command("/route", chat_id, user_info)
            elif text == "📊 Статус":
                return self.handle_command("/status", chat_id, user_info)
            elif text == "❓ Помощь":
                return self.handle_command("/help", chat_id, user_info)
            elif text == "⚙️ Изменить статус":
                return self.handle_command("/change_status", chat_id, user_info)
            else:
                # Простой ответ на обычные сообщения
                response_text = (
                    "🚚 Спасибо за сообщение!\n\n"
                    "Используйте кнопки внизу экрана для взаимодействия с ботом:\n\n"
                    "📦 Мои заказы - просмотр активных заказов\n"
                    "🗺️ Маршрут - маршрут доставки с кнопками процесса\n"
                    "📊 Статус - статус курьера\n"
                    "⚙️ Изменить статус - изменить статус курьера\n"
                    "❓ Помощь - справка"
                )
                
                result = self.send_delivery_message(
                    chat_id, 
                    response_text,
                    reply_markup=self.get_delivery_keyboard()
                )
                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def handle_callback_query(self, callback_query):
        """Обработка callback_query"""
        try:
            callback_id = callback_query.get('id')
            callback_data = callback_query.get('data', '')
            from_user = callback_query.get('from', {})
            user_id = from_user.get('id')
            message = callback_query.get('message', {})
            chat_id = message.get('chat', {}).get('id')
            
            logger.info(f"Delivery callback received: {callback_data} from user {user_id}")
            
            # Обрабатываем тестовую кнопку
            if callback_data.startswith('test_button_'):
                response_text = f"✅ Тестовая кнопка работает! Пользователь: {from_user.get('first_name', 'Unknown')}"
                self.answer_callback_query(callback_id, response_text)
                logger.info(f"Test button callback processed for user {user_id}")
            
            # Обрабатываем кнопку "Заказ принят"
            elif callback_data == 'order_taken':
                response_text = "✅ Заказ уже принят курьером"
                self.answer_callback_query(callback_id, response_text)
                logger.info(f"Order taken callback processed for user {user_id}")
            
            # Обрабатываем callback для обновления статуса заказа
            elif callback_data.startswith('pickup_'):
                order_id = callback_data.replace('pickup_', '')
                response_text = self.update_order_status(order_id, user_id, 'picked_up', 'взят курьером')
                self.answer_callback_query(callback_id, response_text)
                
            elif callback_data.startswith('intransit_'):
                order_id = callback_data.replace('intransit_', '')
                response_text = self.update_order_status(order_id, user_id, 'picked_up', 'взят курьером')
                self.answer_callback_query(callback_id, response_text)
                
                # Обновляем сообщение курьера с новыми кнопками
                self.update_driver_message_after_pickup(user_id, order_id)
                
            elif callback_data.startswith('delivered_'):
                order_id = callback_data.replace('delivered_', '')
                
                # Проверяем способ оплаты
                try:
                    order = Order.objects.get(id=order_id)
                    if order.payment_method == 'card':
                        # Оплата картой - требуем фото чека
                        response_text = "💳 Оплата картой! Пожалуйста, отправьте фото чека для завершения заказа."
                        self.answer_callback_query(callback_id, response_text, show_alert=True)
                        
                        # Отправляем сообщение с инструкцией
                        self.request_receipt_photo(user_id, order_id)
                    else:
                        # Оплата наличными - завершаем сразу
                        response_text = self.update_order_status(order_id, user_id, 'delivered', 'доставлен')
                        self.answer_callback_query(callback_id, response_text)
                        
                        # Обновляем сообщение курьера после завершения заказа
                        self.update_driver_message_after_delivery(user_id, order_id)
                        
                except Order.DoesNotExist:
                    response_text = f"❌ Заказ #{order_id} не найден"
                    self.answer_callback_query(callback_id, response_text)
                
            elif callback_data.startswith('change_driver_status_'):
                # Обрабатываем изменение статуса курьера
                parts = callback_data.split('_')
                if len(parts) >= 4:
                    new_status = parts[3]  # active, busy, offline
                    driver_id = parts[4]
                    
                    try:
                        driver = DeliveryDriver.objects.get(id=driver_id, telegram_id=user_id)
                        
                        old_status = driver.status
                        driver.status = new_status
                        driver.save()
                        
                        status_names = {
                            'active': 'Активный',
                            'busy': 'Занят',
                            'offline': 'Не в сети'
                        }
                        
                        response_text = f"✅ Статус изменен с '{old_status}' на '{status_names.get(new_status, new_status)}'"
                        self.answer_callback_query(callback_id, response_text)
                        
                        logger.info(f"Driver {driver.user.first_name} status changed from {old_status} to {new_status}")
                        
                    except DeliveryDriver.DoesNotExist:
                        response_text = "❌ Курьер не найден"
                        self.answer_callback_query(callback_id, response_text)
                    except Exception as e:
                        logger.error(f"Error changing driver status: {str(e)}")
                        response_text = "❌ Ошибка изменения статуса"
                        self.answer_callback_query(callback_id, response_text)
            
            # Обрабатываем callback для принятия заказа
            elif callback_data.startswith('take_order_'):
                order_id = callback_data.replace('take_order_', '')
                
                try:
                    order_id = int(order_id)
                    order = Order.objects.get(id=order_id)
                    
                    # Ищем курьера по telegram_id
                    try:
                        driver = DeliveryDriver.objects.get(telegram_id=user_id, is_active=True)
                        
                        # Проверяем, есть ли уже назначение для этого заказа
                        existing_assignment = DeliveryAssignment.objects.filter(
                            order=order,
                            status__in=['assigned', 'accepted', 'picked_up', 'delivering']
                        ).first()
                        
                        if existing_assignment:
                            # Проверяем статус назначения
                            if existing_assignment.status == 'assigned':
                                # Заказ назначен, но еще не принят - любой курьер может его взять
                                existing_assignment.driver = driver
                                existing_assignment.status = 'accepted'
                                existing_assignment.accepted_at = timezone.now()
                                existing_assignment.save()
                                
                                response_text = f"✅ Заказ #{order_id} принят курьером {driver.user.first_name}!"
                                
                                # Обновляем сообщение в группе
                                self.update_group_message(order, existing_assignment)
                                
                                # Отправляем команду /route курьеру
                                self.send_route_command_to_driver(driver.telegram_id)
                            elif existing_assignment.status == 'accepted':
                                # Заказ уже принят другим курьером
                                response_text = f"❌ Заказ #{order_id} уже принят курьером {existing_assignment.driver.user.first_name}"
                            else:
                                # Заказ в процессе выполнения
                                response_text = f"❌ Заказ #{order_id} уже в процессе выполнения"
                        else:
                            # Создаем новое назначение
                            assignment = DeliveryAssignment.objects.create(
                                order=order,
                                driver=driver,
                                status='accepted',
                                accepted_at=timezone.now()
                            )
                            
                            response_text = f"✅ Заказ #{order_id} принят курьером {driver.user.first_name}!"
                            
                            # Обновляем сообщение в группе
                            self.update_group_message(order, assignment)
                            
                            # Отправляем команду /route курьеру
                            self.send_route_command_to_driver(driver.telegram_id)
                        
                    except DeliveryDriver.DoesNotExist:
                        response_text = f"❌ Курьер с Telegram ID {user_id} не найден или неактивен"
                    
                    # Отвечаем на callback
                    self.answer_callback_query(callback_id, response_text)
                    
                except (ValueError, Order.DoesNotExist):
                    response_text = f"❌ Заказ #{order_id} не найден"
                    self.answer_callback_query(callback_id, response_text)
            
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error handling callback query: {str(e)}")
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def send_delivery_message(self, chat_id, text, parse_mode=None, reply_markup=None):
        """Отправляет сообщение через бота доставщиков"""
        try:
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
            if not delivery_bot_token:
                logger.error("DELIVERY_BOT_TOKEN not found")
                return {'success': False, 'error': 'Bot token not configured'}
            
            url = f'https://api.telegram.org/bot{delivery_bot_token}/sendMessage'
            data = {
                'chat_id': chat_id,
                'text': text
            }
            
            if parse_mode:
                data['parse_mode'] = parse_mode
            if reply_markup:
                data['reply_markup'] = reply_markup
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    logger.info(f"Message sent successfully to {chat_id} via delivery bot")
                    return {
                        'success': True,
                        'message_id': result['result']['message_id'],
                        'chat_id': chat_id
                    }
                else:
                    logger.error(f"Telegram API error: {result}")
                    return {'success': False, 'error': result.get('description', 'Unknown error')}
            else:
                logger.error(f"HTTP error {response.status_code}: {response.text}")
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except requests.RequestException as e:
            logger.error(f"Network error sending delivery message: {str(e)}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error sending delivery message: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def get_delivery_keyboard(self):
        """Возвращает Reply Keyboard для курьеров"""
        return {
            "keyboard": [
                ["📦 Мои заказы", "🗺️ Маршрут"],
                ["📊 Статус", "⚙️ Изменить статус"],
                ["❓ Помощь"]
            ],
            "resize_keyboard": True,
            "one_time_keyboard": False,
            "selective": False
        }
    
    def answer_callback_query(self, callback_id, text, show_alert=False):
        """Отвечает на callback query"""
        try:
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
            if not delivery_bot_token:
                logger.error("DELIVERY_BOT_TOKEN not found")
                return {'success': False, 'error': 'Bot token not configured'}
            
            url = f'https://api.telegram.org/bot{delivery_bot_token}/answerCallbackQuery'
            data = {
                'callback_query_id': callback_id,
                'text': text,
                'show_alert': show_alert
            }
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    logger.info(f"Callback query answered successfully: {text}")
                    return {'success': True}
                else:
                    logger.error(f"Telegram API error answering callback: {result}")
                    return {'success': False, 'error': result.get('description', 'Unknown error')}
            else:
                logger.error(f"HTTP error answering callback {response.status_code}: {response.text}")
                return {'success': False, 'error': f'HTTP {response.status_code}'}
                
        except requests.RequestException as e:
            logger.error(f"Network error answering callback: {str(e)}")
            return {'success': False, 'error': str(e)}
        except Exception as e:
            logger.error(f"Error answering callback: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    def update_group_message(self, order, assignment):
        """Обновляет сообщение в группе после принятия заказа"""
        try:
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
            group_chat_id = order.restaurant.telegram_group_id
            
            if not delivery_bot_token or not group_chat_id or not order.telegram_message_id:
                logger.warning("Missing required data for updating group message")
                return
            
            # Формируем обновленное сообщение
            message = f"""🚚 <b>Заказ принят!</b>

📋 Заказ #{order.id}
🏪 Ресторан: {order.restaurant.name if order.restaurant else 'Не указан'}
👤 Клиент: {order.user.first_name} {order.user.last_name}
📞 Телефон: {order.phone}
📍 Адрес: {order.address.full_address if order.address else 'Адрес не указан'}
💰 Сумма: {order.final_price:,} сум
💳 Оплата: {order.get_payment_method_display()}
⏰ Время: {order.created_at.strftime('%H:%M')}

✅ <b>Принят курьером:</b> {assignment.driver.user.first_name}
📱 Telegram: @{assignment.driver.user.username if assignment.driver.user.username else 'не указан'}

🍽️ <b>Заказ:</b>"""
            
            # Добавляем товары
            for item in order.orderitem_set.all():
                message += f"\n• {item.quantity}x {item.menu_item.name}"
                if hasattr(item, 'size_option') and item.size_option:
                    message += f" ({item.size_option.name})"
                message += f" - {item.menu_item.price * item.quantity:,} сум"
            
            if order.notes:
                message += f"\n\n📝 <b>Заметки:</b> {order.notes}"
            
            # Обновляем сообщение с новыми кнопками
            url = f"https://api.telegram.org/bot{delivery_bot_token}/editMessageText"
            data = {
                "chat_id": group_chat_id,
                "message_id": order.telegram_message_id,
                "text": message,
                "parse_mode": "HTML",
                "reply_markup": {
                    "inline_keyboard": [[{
                        "text": f"✅ Принят курьером: {assignment.driver.user.first_name}",
                        "callback_data": "order_taken"
                    }]]
                }
            }
            
            response = requests.post(url, json=data, timeout=10)
            if response.status_code == 200:
                logger.info(f"Group message updated for order #{order.id}")
            else:
                logger.error(f"Error updating group message: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"Error updating group message: {str(e)}")
    
    def update_order_status(self, order_id, user_id, new_status, status_description):
        """Обновляет статус заказа курьером"""
        try:
            order_id = int(order_id)
            order = Order.objects.get(id=order_id)
            
            # Ищем курьера
            driver = DeliveryDriver.objects.get(telegram_id=user_id, is_active=True)
            
            # Ищем назначение
            assignment = DeliveryAssignment.objects.filter(
                order=order,
                driver=driver
            ).first()
            
            if not assignment:
                return f"❌ Заказ #{order_id} не назначен вам"
            
            # Обновляем статус
            old_status = assignment.status
            assignment.status = new_status
            
            if new_status == 'picked_up':
                assignment.picked_up_at = timezone.now()
                # Обновляем статус заказа на "в пути"
                order.status = 'in_transit'
                order.save()
            elif new_status == 'delivered':
                assignment.delivered_at = timezone.now()
                # Обновляем счетчик курьера
                driver.current_orders_count = max(0, driver.current_orders_count - 1)
                driver.total_deliveries += 1
                driver.save()
                # Обновляем статус заказа на "завершен"
                order.status = 'completed'
                order.save()
            
            assignment.save()
            
            logger.info(f"Order #{order_id} status updated from {old_status} to {new_status} by driver {driver.user.first_name}")
            
            return f"✅ Заказ #{order_id} {status_description}!"
            
        except (ValueError, Order.DoesNotExist, DeliveryDriver.DoesNotExist) as e:
            logger.error(f"Error updating order status: {str(e)}")
            return f"❌ Ошибка обновления статуса заказа #{order_id}"
    
    def create_order_keyboard(self, assignments):
        """Создает клавиатуру с кнопками для заказов"""
        keyboard = []
        for assignment in assignments:
            order = assignment.order
            restaurant = order.restaurant
            address = order.address
            
            # Кнопки в зависимости от статуса заказа
            if assignment.status == 'accepted':
                # Заказ принят - показываем кнопки для начала процесса
                keyboard.append([{
                    'text': f'🚗 Взять заказ #{order.id}',
                    'callback_data': f'intransit_{order.id}'
                }])
                
                if restaurant and address and restaurant.latitude and restaurant.longitude and address.latitude and address.longitude:
                    route_url = f"https://yandex.ru/maps/?rtext={restaurant.latitude},{restaurant.longitude}~{address.latitude},{address.longitude}&rtt=auto"
                    keyboard.append([{
                        'text': f'🗺️ Показать маршрут #{order.id}',
                        'url': route_url
                    }])
                else:
                    keyboard.append([{
                        'text': f'❌ Нет координат #{order.id}',
                        'callback_data': 'no_coords'
                    }])
                    
            elif assignment.status == 'picked_up':
                # Забран - показываем кнопку завершения
                keyboard.append([{
                    'text': f'✅ Завершить заказ #{order.id}',
                    'callback_data': f'delivered_{order.id}'
                }])
                
                if restaurant and address and restaurant.latitude and restaurant.longitude and address.latitude and address.longitude:
                    route_url = f"https://yandex.ru/maps/?rtext={restaurant.latitude},{restaurant.longitude}~{address.latitude},{address.longitude}&rtt=auto"
                    keyboard.append([{
                        'text': f'🗺️ Маршрут #{order.id}',
                        'url': route_url
                    }])
        
        return {'inline_keyboard': keyboard} if keyboard else {}
    
    def send_route_command_to_driver(self, driver_telegram_id):
        """Отправляет курьеру его текущий заказ с кнопками после принятия заказа"""
        try:
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
            
            if not delivery_bot_token:
                logger.warning("DELIVERY_BOT_TOKEN not found")
                return
            
            # Получаем активные заказы курьера
            from api.models import User, DeliveryDriver, DeliveryAssignment
            try:
                user = User.objects.get(telegram_id=driver_telegram_id)
                driver = DeliveryDriver.objects.get(user=user)
                
                assignments = DeliveryAssignment.objects.filter(
                    driver=driver,
                    status__in=['accepted', 'picked_up']
                ).order_by('-assigned_at')[:3]
                
                if assignments:
                    route_text = "🗺️ <b>Ваш маршрут обновлен!</b>\n\n"
                    
                    for i, assignment in enumerate(assignments, 1):
                        order = assignment.order
                        restaurant = order.restaurant
                        address = order.address
                        
                        status_text = {
                            'accepted': 'Принят',
                            'picked_up': 'В пути',
                            'delivered': 'Доставлен'
                        }.get(assignment.status, assignment.status)
                        
                        route_text += (
                            f"{i}. Заказ #{order.id}\n"
                            f"   📍 От: {restaurant.name if restaurant else 'Не указан'}\n"
                            f"   📍 До: {address.street if address else 'Не указан'}, {address.house_number if address else ''}\n"
                            f"   📞 Клиент: {order.phone}\n"
                            f"   💰 Сумма: {order.final_price:,} сум\n"
                            f"   ⏰ Статус: {status_text}\n\n"
                        )
                    
                    # Создаем клавиатуру с кнопками
                    reply_markup = self.create_order_keyboard(assignments)
                    
                    # Отправляем обновленное сообщение курьеру
                    url = f"https://api.telegram.org/bot{delivery_bot_token}/sendMessage"
                    data = {
                        "chat_id": driver_telegram_id,
                        "text": route_text,
                        "parse_mode": "HTML",
                        "reply_markup": reply_markup
                    }
                    
                    response = requests.post(url, json=data, timeout=10)
                    if response.status_code == 200:
                        logger.info(f"Updated route sent to driver {driver_telegram_id}")
                    else:
                        logger.error(f"Error sending updated route: {response.status_code} - {response.text}")
                else:
                    # Нет активных заказов
                    url = f"https://api.telegram.org/bot{delivery_bot_token}/sendMessage"
                    data = {
                        "chat_id": driver_telegram_id,
                        "text": "🗺️ У вас нет активных заказов для маршрута.",
                        "parse_mode": "HTML"
                    }
                    
                    response = requests.post(url, json=data, timeout=10)
                    if response.status_code == 200:
                        logger.info(f"No active orders notification sent to driver {driver_telegram_id}")
                    else:
                        logger.error(f"Error sending no orders notification: {response.status_code} - {response.text}")
                        
            except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                logger.warning(f"Driver with telegram_id {driver_telegram_id} not found")
                
        except Exception as e:
            logger.error(f"Error sending route command to driver: {str(e)}")
    
    def update_driver_message_after_pickup(self, driver_telegram_id, order_id):
        """Обновляет сообщение курьера после взятия заказа"""
        try:
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
            
            if not delivery_bot_token:
                logger.warning("DELIVERY_BOT_TOKEN not found")
                return
            
            # Получаем активные заказы курьера
            from api.models import User, DeliveryDriver, DeliveryAssignment
            try:
                user = User.objects.get(telegram_id=driver_telegram_id)
                driver = DeliveryDriver.objects.get(user=user)
                
                assignments = DeliveryAssignment.objects.filter(
                    driver=driver,
                    status__in=['accepted', 'picked_up']
                ).order_by('-assigned_at')[:3]
                
                if assignments:
                    route_text = "🗺️ <b>Ваш маршрут обновлен!</b>\n\n"
                    
                    for i, assignment in enumerate(assignments, 1):
                        order = assignment.order
                        restaurant = order.restaurant
                        address = order.address
                        
                        status_text = {
                            'accepted': 'Принят',
                            'picked_up': 'В пути',
                            'delivered': 'Доставлен'
                        }.get(assignment.status, assignment.status)
                        
                        route_text += (
                            f"{i}. Заказ #{order.id}\n"
                            f"   📍 От: {restaurant.name if restaurant else 'Не указан'}\n"
                            f"   📍 До: {address.street if address else 'Не указан'}, {address.house_number if address else ''}\n"
                            f"   📞 Клиент: {order.phone}\n"
                            f"   💰 Сумма: {order.final_price:,} сум\n"
                            f"   ⏰ Статус: {status_text}\n\n"
                        )
                    
                    # Создаем клавиатуру с кнопками
                    reply_markup = self.create_order_keyboard(assignments)
                    
                    # Отправляем обновленное сообщение курьеру
                    url = f"https://api.telegram.org/bot{delivery_bot_token}/sendMessage"
                    data = {
                        "chat_id": driver_telegram_id,
                        "text": route_text,
                        "parse_mode": "HTML",
                        "reply_markup": reply_markup
                    }
                    
                    response = requests.post(url, json=data, timeout=10)
                    if response.status_code == 200:
                        logger.info(f"Updated message sent to driver {driver_telegram_id} after pickup")
                    else:
                        logger.error(f"Error sending updated message: {response.status_code} - {response.text}")
                        
            except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                logger.warning(f"Driver with telegram_id {driver_telegram_id} not found")
                
        except Exception as e:
            logger.error(f"Error updating driver message after pickup: {str(e)}")
    
    def update_driver_message_after_delivery(self, driver_telegram_id, order_id):
        """Обновляет сообщение курьера после завершения заказа"""
        try:
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
            
            if not delivery_bot_token:
                logger.warning("DELIVERY_BOT_TOKEN not found")
                return
            
            # Получаем активные заказы курьера
            from api.models import User, DeliveryDriver, DeliveryAssignment
            try:
                user = User.objects.get(telegram_id=driver_telegram_id)
                driver = DeliveryDriver.objects.get(user=user)
                
                assignments = DeliveryAssignment.objects.filter(
                    driver=driver,
                    status__in=['accepted', 'picked_up']
                ).order_by('-assigned_at')[:3]
                
                if assignments:
                    route_text = "🗺️ <b>Ваш маршрут обновлен!</b>\n\n"
                    
                    for i, assignment in enumerate(assignments, 1):
                        order = assignment.order
                        restaurant = order.restaurant
                        address = order.address
                        
                        status_text = {
                            'accepted': 'Принят',
                            'picked_up': 'В пути',
                            'delivered': 'Доставлен'
                        }.get(assignment.status, assignment.status)
                        
                        route_text += (
                            f"{i}. Заказ #{order.id}\n"
                            f"   📍 От: {restaurant.name if restaurant else 'Не указан'}\n"
                            f"   📍 До: {address.street if address else 'Не указан'}, {address.house_number if address else ''}\n"
                            f"   📞 Клиент: {order.phone}\n"
                            f"   💰 Сумма: {order.final_price:,} сум\n"
                            f"   ⏰ Статус: {status_text}\n\n"
                        )
                    
                    # Создаем клавиатуру с кнопками
                    reply_markup = self.create_order_keyboard(assignments)
                    
                    # Отправляем обновленное сообщение курьеру
                    url = f"https://api.telegram.org/bot{delivery_bot_token}/sendMessage"
                    data = {
                        "chat_id": driver_telegram_id,
                        "text": route_text,
                        "parse_mode": "HTML",
                        "reply_markup": reply_markup
                    }
                    
                    response = requests.post(url, json=data, timeout=10)
                    if response.status_code == 200:
                        logger.info(f"Updated message sent to driver {driver_telegram_id} after delivery")
                    else:
                        logger.error(f"Error sending updated message: {response.status_code} - {response.text}")
                else:
                    # Нет активных заказов - отправляем сообщение о завершении
                    completion_text = f"🎉 <b>Заказ #{order_id} завершен!</b>\n\nУ вас нет активных заказов."
                    
                    url = f"https://api.telegram.org/bot{delivery_bot_token}/sendMessage"
                    data = {
                        "chat_id": driver_telegram_id,
                        "text": completion_text,
                        "parse_mode": "HTML"
                    }
                    
                    response = requests.post(url, json=data, timeout=10)
                    if response.status_code == 200:
                        logger.info(f"Completion message sent to driver {driver_telegram_id}")
                    else:
                        logger.error(f"Error sending completion message: {response.status_code} - {response.text}")
                        
            except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                logger.warning(f"Driver with telegram_id {driver_telegram_id} not found")
                
        except Exception as e:
            logger.error(f"Error updating driver message after delivery: {str(e)}")
    
    def request_receipt_photo(self, driver_telegram_id, order_id):
        """Отправляет курьеру запрос на фото чека"""
        try:
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
            
            if not delivery_bot_token:
                logger.warning("DELIVERY_BOT_TOKEN not found")
                return
            
            # Отправляем сообщение с инструкцией
            message_text = f"""💳 <b>Заказ #{order_id} - Оплата картой</b>

Для завершения заказа необходимо отправить фото чека.

📸 <b>Инструкция:</b>
1. Сделайте фото чека
2. Отправьте его в этот чат
3. После проверки заказ будет завершен

⚠️ <b>Важно:</b> Чек должен быть четким и читаемым!"""
            
            url = f"https://api.telegram.org/bot{delivery_bot_token}/sendMessage"
            data = {
                "chat_id": driver_telegram_id,
                "text": message_text,
                "parse_mode": "HTML"
            }
            
            response = requests.post(url, json=data, timeout=10)
            if response.status_code == 200:
                logger.info(f"Receipt photo request sent to driver {driver_telegram_id} for order #{order_id}")
            else:
                logger.error(f"Error sending receipt photo request: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"Error requesting receipt photo: {str(e)}")
    
    def handle_photo_message(self, chat_id, user_info, photo_info):
        """Обрабатывает фотографии от курьера"""
        try:
            from api.models import User, DeliveryDriver, DeliveryAssignment, Order
            import requests
            import os
            from dotenv import load_dotenv
            load_dotenv()
            
            telegram_id = user_info.get('id')
            
            # Ищем курьера
            try:
                user = User.objects.get(telegram_id=telegram_id)
                driver = DeliveryDriver.objects.get(user=user)
                
                # Ищем активные заказы курьера, которые требуют фото чека
                assignments = DeliveryAssignment.objects.filter(
                    driver=driver,
                    status='picked_up',
                    order__payment_method='card',
                    receipt_photo__isnull=True
                ).order_by('-assigned_at')[:1]
                
                if assignments:
                    assignment = assignments[0]
                    order = assignment.order
                    
                    # Получаем файл фотографии
                    delivery_bot_token = os.getenv('DELIVERY_BOT_TOKEN')
                    if not delivery_bot_token:
                        logger.error("DELIVERY_BOT_TOKEN not found")
                        return Response({'error': 'Bot token not configured'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
                    # Получаем file_id самого большого фото
                    largest_photo = max(photo_info, key=lambda x: x.get('file_size', 0))
                    file_id = largest_photo.get('file_id')
                    
                    # Получаем URL файла
                    file_url_response = requests.get(
                        f"https://api.telegram.org/bot{delivery_bot_token}/getFile",
                        params={'file_id': file_id},
                        timeout=10
                    )
                    
                    if file_url_response.status_code == 200:
                        file_data = file_url_response.json()
                        if file_data.get('ok'):
                            file_path = file_data['result']['file_path']
                            file_url = f"https://api.telegram.org/file/bot{delivery_bot_token}/{file_path}"
                            
                            # Скачиваем файл
                            photo_response = requests.get(file_url, timeout=30)
                            if photo_response.status_code == 200:
                                # Сохраняем фото
                                from django.core.files.base import ContentFile
                                photo_content = ContentFile(photo_response.content)
                                photo_name = f"receipt_order_{order.id}_{assignment.id}.jpg"
                                assignment.receipt_photo.save(photo_name, photo_content, save=True)
                                
                                # Обновляем статус заказа
                                assignment.status = 'delivered'
                                assignment.delivered_at = timezone.now()
                                assignment.save()
                                
                                # Обновляем статус заказа
                                order.status = 'completed'
                                order.save()
                                
                                # Обновляем счетчик курьера
                                driver.current_orders_count = max(0, driver.current_orders_count - 1)
                                driver.total_deliveries += 1
                                driver.save()
                                
                                # Отправляем подтверждение
                                response_text = f"✅ Фото чека получено для заказа #{order.id}!\n\n🎉 Заказ завершен."
                                self.send_delivery_message(
                                    chat_id=chat_id,
                                    text=response_text,
                                    reply_markup=self.get_delivery_keyboard()
                                )
                                
                                logger.info(f"Receipt photo processed for order #{order.id} by driver {driver.user.first_name}")
                                return Response({'status': 'ok'}, status=status.HTTP_200_OK)
                            else:
                                logger.error(f"Error downloading photo: {photo_response.status_code}")
                        else:
                            logger.error(f"Error getting file info: {file_data}")
                    else:
                        logger.error(f"Error getting file URL: {file_url_response.status_code}")
                        
                    # Если не удалось обработать фото
                    response_text = "❌ Ошибка обработки фото. Попробуйте еще раз."
                    self.send_delivery_message(
                        chat_id=chat_id,
                        text=response_text,
                        reply_markup=self.get_delivery_keyboard()
                    )
                    
                else:
                    # Нет заказов, требующих фото чека
                    response_text = "❌ У вас нет заказов, требующих фото чека."
                    self.send_delivery_message(
                        chat_id=chat_id,
                        text=response_text,
                        reply_markup=self.get_delivery_keyboard()
                    )
                    
            except (User.DoesNotExist, DeliveryDriver.DoesNotExist):
                response_text = "❌ Вы не зарегистрированы как курьер."
                self.send_delivery_message(
                    chat_id=chat_id,
                    text=response_text,
                    reply_markup=self.get_delivery_keyboard()
                )
                
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error handling photo message: {str(e)}")
            response_text = "❌ Ошибка обработки фото. Попробуйте еще раз."
            self.send_delivery_message(
                chat_id=chat_id,
                text=response_text,
                reply_markup=self.get_delivery_keyboard()
            )
            return Response({'error': 'Internal server error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
