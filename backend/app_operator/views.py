from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from rest_framework.authtoken.views import ObtainAuthToken
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import update_last_login
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
import requests
import logging

from .models import (
    Operator, OperatorSession, OrderAssignment, 
    OrderStatusHistory, OperatorNotification, OperatorAnalytics
)
from api.models import Order, OrderItem, MenuItem, SizeOption, AddOn
from .serializers import (
    OperatorRegistrationSerializer, OperatorLoginSerializer, OperatorProfileSerializer,
    OperatorSessionSerializer, OrderAssignmentSerializer, OrderStatusChangeSerializer,
    OrderListSerializer, OperatorNotificationSerializer, OperatorAnalyticsSerializer,
    DeliveryZoneSerializer, OrderMapLocationSerializer, OrderForOperatorSerializer
)
from api.models import Order, DeliveryZone, User, Address

logger = logging.getLogger(__name__)

class OperatorAuthViewSet(viewsets.ViewSet):
    """
    ViewSet для аутентификации операторов
    """
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Регистрация нового оператора"""
        serializer = OperatorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            operator = serializer.save()
            
            # Создаем токен для автоматического входа
            try:
                token, created = Token.objects.get_or_create(user=operator)
            except Exception as e:
                # Если не удалось создать токен, возвращаем ошибку
                return Response({
                    'error': 'Ошибка создания токена аутентификации'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'message': 'Оператор успешно зарегистрирован',
                'token': token.key,
                'operator': OperatorProfileSerializer(operator).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        """Вход оператора"""
        serializer = OperatorLoginSerializer(data=request.data)
        if serializer.is_valid():
            operator = serializer.validated_data['user']
            
            # Загружаем оператора с связанными зонами доставки
            operator_with_zones = Operator.objects.prefetch_related('assigned_zones').get(id=operator.id)
            
            # Создаем или получаем токен
            try:
                token, created = Token.objects.get_or_create(user=operator)
                # Обновляем время последнего входа
                update_last_login(None, operator)
            except Exception as e:
                # Если не удалось создать токен, возвращаем ошибку
                return Response({
                    'error': 'Ошибка создания токена аутентификации'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'message': 'Успешный вход',
                'token': token.key,
                'operator': OperatorProfileSerializer(operator_with_zones).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def logout(self, request):
        """Выход оператора"""
        if request.user.is_authenticated:
            # Удаляем токен
            try:
                Token.objects.filter(user=request.user).delete()
                logout(request)
                return Response({'message': 'Успешный выход'}, status=status.HTTP_200_OK)
            except Exception as e:
                # Если не удалось удалить токен, все равно выходим
                logout(request)
                return Response({'message': 'Выход выполнен'}, status=status.HTTP_200_OK)
        
        return Response({'message': 'Не авторизован'}, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['get'])
    def verify_token(self, request):
        """Проверка токена оператора"""
        if request.user.is_authenticated:
            try:
                # Получаем профиль оператора
                operator_data = OperatorProfileSerializer(request.user).data
                return Response({
                    'valid': True,
                    'operator': operator_data
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    'valid': False,
                    'error': 'Ошибка получения данных оператора'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'valid': False,
            'error': 'Токен недействителен'
        }, status=status.HTTP_401_UNAUTHORIZED)

class OperatorProfileViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для профиля оператора
    """
    serializer_class = OperatorProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Operator.objects.filter(id=self.request.user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Получение профиля текущего оператора"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'])
    def update_profile(self, request):
        """Обновление профиля оператора"""
        serializer = OperatorProfileSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OperatorSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления сессиями операторов
    """
    serializer_class = OperatorSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OperatorSession.objects.filter(operator=self.request.user)

    def perform_create(self, serializer):
        """Создание новой сессии"""
        serializer.save(operator=self.request.user)

    @action(detail=True, methods=['post'])
    def end_session(self, request, pk=None):
        """Завершение сессии"""
        session = self.get_object()
        if session.status == 'active':
            session.end_session()
            return Response({'message': 'Сессия завершена'}, status=status.HTTP_200_OK)
        return Response({'message': 'Сессия уже завершена'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Получение текущей активной сессии"""
        try:
            session = self.get_queryset().filter(status='active').latest('start_time')
            serializer = self.get_serializer(session)
            return Response(serializer.data)
        except OperatorSession.DoesNotExist:
            return Response({'message': 'Нет активной сессии'}, status=status.HTTP_404_NOT_FOUND)

class OrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для управления заказами операторами
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['id', 'address__street', 'address__house_number']
    ordering_fields = ['created_at', 'total_price', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Получение заказов для оператора"""
        operator = self.request.user
        
        # Получаем зоны оператора
        operator_zones = operator.assigned_zones.filter(is_active=True)
        
        # Фильтруем заказы по зонам оператора
        from django.db.models import Q
        
        operator_cities = list(operator_zones.values_list('city', flat=True).distinct())
        queryset = Order.objects.filter(
            Q(service_type='delivery', address__city__in=operator_cities) |  # Доставка: только по адресу клиента
            Q(service_type='pickup', restaurant__city__in=operator_cities)  # Самовывоз: только по городу ресторана
        )
        
        # Фильтрация по статусу
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Фильтрация по зоне доставки
        zone_filter = self.request.query_params.get('zone')
        if zone_filter:
            queryset = queryset.filter(
                address__latitude__isnull=False,
                address__longitude__isnull=False
            ).extra(
                where=[
                    """
                    EXISTS (
                        SELECT 1 FROM api_deliveryzone dz 
                        WHERE dz.id = %s 
                        AND dz.is_active = 1
                        AND (
                            6371 * acos(
                                cos(radians(dz.center_latitude)) * 
                                cos(radians(api_address.latitude)) * 
                                cos(radians(api_address.longitude) - radians(dz.center_longitude)) + 
                                sin(radians(dz.center_latitude)) * 
                                sin(radians(api_address.latitude))
                            )
                        ) <= dz.radius_km
                    """
                ],
                params=[zone_filter]
            )
        
        # Фильтрация по дате
        date_filter = self.request.query_params.get('date')
        if date_filter:
            try:
                date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date=date)
            except ValueError:
                pass
        
        return queryset

    @action(detail=True, methods=['get'])
    def details(self, request, pk=None):
        """Детальная информация о заказе"""
        order = get_object_or_404(Order, pk=pk)
        
        # Проверяем, может ли оператор обрабатывать этот заказ
        can_handle, message = request.user.can_handle_order(order)
        if not can_handle:
            return Response(
                {'error': message}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = OrderListSerializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Назначение заказа оператору"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, может ли оператор обрабатывать заказ
        can_handle, message = operator.can_handle_order(order)
        if not can_handle:
            return Response(
                {'error': message}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, не назначен ли уже заказ
        if OrderAssignment.objects.filter(order=order).exists():
            return Response(
                {'error': 'Заказ уже назначен оператору'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем назначение
        assignment = OrderAssignment.objects.create(
            order=order,
            operator=operator
        )
        
        # Обновляем статус заказа
        old_status = order.status
        order.status = 'assigned'
        order.assigned_operator = operator
        order.assigned_at = timezone.now()
        order.save()
        
        # Создаем запись в истории статусов
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status=old_status,
            new_status='assigned',
            reason='Заказ назначен оператору'
        )
        
        # Создаем уведомление
        OperatorNotification.objects.create(
            operator=operator,
            notification_type='new_order',
            title='Новый заказ назначен',
            message=f'Вам назначен заказ #{order.id}',
            order=order
        )
        
        serializer = OrderAssignmentSerializer(assignment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Принятие заказа оператором"""
        try:
            assignment = OrderAssignment.objects.get(
                order_id=pk,
                operator=request.user,
                status='assigned'
            )
            assignment.accept_assignment()
            
            # Обновляем статус заказа
            order = assignment.order
            order.status = 'preparing'
            order.save()
            
            # Создаем запись в истории
            OrderStatusHistory.objects.create(
                order=order,
                operator=request.user,
                old_status='pending',
                new_status='preparing',
                reason='Заказ принят оператором'
            )
            
            serializer = OrderAssignmentSerializer(assignment)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        except OrderAssignment.DoesNotExist:
            return Response(
                {'error': 'Назначение не найдено'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Отклонение заказа оператором"""
        try:
            assignment = OrderAssignment.objects.get(
                order_id=pk,
                operator=request.user,
                status='assigned'
            )
            
            reason = request.data.get('reason', '')
            assignment.reject_assignment(reason)
            
            # Удаляем назначение
            assignment.delete()
            
            return Response(
                {'message': 'Заказ отклонен'}, 
                status=status.HTTP_200_OK
            )
        
        except OrderAssignment.DoesNotExist:
            return Response(
                {'error': 'Назначение не найдено'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['put', 'patch'])
    def change_status(self, request, pk=None):
        """Изменение статуса заказа"""
        order = get_object_or_404(Order, pk=pk)
        
        # Проверяем, назначен ли заказ текущему оператору
        try:
            assignment = OrderAssignment.objects.get(
                order=order,
                operator=request.user,
                status__in=['accepted', 'completed']
            )
        except OrderAssignment.DoesNotExist:
            return Response(
                {'error': 'Заказ не назначен вам'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = OrderStatusChangeSerializer(
            order, 
            data=request.data, 
            context={'request': request, 'order': order}
        )
        
        if serializer.is_valid():
            updated_order = serializer.save()
            
            # Если заказ завершен, обновляем статистику
            if updated_order.status == 'completed':
                assignment.complete_assignment()
                assignment.save()
            
            return Response(OrderListSerializer(updated_order).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OperatorNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для уведомлений операторов
    """
    serializer_class = OperatorNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OperatorNotification.objects.filter(operator=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Отметить уведомления как прочитанные"""
        notification_ids = request.data.get('notification_ids', [])
        
        if notification_ids:
            self.get_queryset().filter(id__in=notification_ids).update(is_read=True)
        else:
            # Отмечаем все уведомления как прочитанные
            self.get_queryset().update(is_read=True)
        
        return Response({'message': 'Уведомления отмечены как прочитанные'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Количество непрочитанных уведомлений"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

class OperatorAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для аналитики операторов
    """
    serializer_class = OperatorAnalyticsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return OperatorAnalytics.objects.filter(operator=self.request.user)

    @action(detail=False, methods=['get'])
    def daily(self, request):
        """Дневная аналитика"""
        date_str = request.query_params.get('date')
        if date_str:
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                date = timezone.now().date()
        else:
            date = timezone.now().date()
        
        analytics, created = OperatorAnalytics.objects.get_or_create(
            operator=request.user,
            date=date
        )
        
        if not created:
            # Обновляем аналитику
            analytics = OperatorAnalytics.update_daily_analytics(request.user, date)
        
        serializer = self.get_serializer(analytics)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Сводная аналитика"""
        # Статистика за последние 30 дней
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)
        
        analytics = self.get_queryset().filter(
            date__range=[start_date, end_date]
        )
        
        summary = {
            'total_orders': analytics.aggregate(Sum('total_orders'))['total_orders__sum'] or 0,
            'completed_orders': analytics.aggregate(Sum('completed_orders'))['completed_orders__sum'] or 0,
            'avg_delivery_time': analytics.aggregate(Avg('avg_delivery_time'))['avg_delivery_time__avg'] or 0,
            'completion_rate': 0
        }
        
        if summary['total_orders'] > 0:
            summary['completion_rate'] = round(
                (summary['completed_orders'] / summary['total_orders']) * 100, 1
            )
        
        return Response(summary)

class DeliveryZoneViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для зон доставки
    """
    serializer_class = DeliveryZoneSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Возвращаем зоны, назначенные оператору
        return DeliveryZone.objects.filter(
            operators=self.request.user,
            is_active=True
        )

class OrderMapViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet для работы с картами заказов
    """
    serializer_class = OrderMapLocationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Получение заказов с координатами для карты"""
        operator = self.request.user
        operator_zones = operator.assigned_zones.filter(is_active=True)
        
        from django.db.models import Q
        
        operator_cities = list(operator_zones.values_list('city', flat=True).distinct())
        return Order.objects.filter(
            Q(service_type='delivery', address__city__in=operator_cities) |  # Доставка: только по адресу клиента
            Q(service_type='pickup', restaurant__city__in=operator_cities),  # Самовывоз: только по городу ресторана
            address__latitude__isnull=False,
            address__longitude__isnull=False
        )

    @action(detail=True, methods=['get'])
    def route(self, request, pk=None):
        """Получение маршрута доставки"""
        order = get_object_or_404(Order, pk=pk)
        
        # Проверяем, может ли оператор обрабатывать заказ
        can_handle, message = request.user.can_handle_order(order)
        if not can_handle:
            return Response(
                {'error': message}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Получаем координаты заказа
        address = order.address
        if not address.latitude or not address.longitude:
            return Response(
                {'error': 'Координаты адреса не определены'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Здесь можно интегрировать с Яндекс.Карты API для получения маршрута
        # Пока возвращаем базовую информацию
        route_info = {
            'order_id': order.id,
            'destination': {
                'latitude': float(address.latitude),
                'longitude': float(address.longitude),
                'address': address.full_address
            },
            'estimated_time': 30,  # Примерное время в минутах
            'distance': 5.2  # Примерное расстояние в км
        }
        
        return Response(route_info)


# Новые views для операторов
class OperatorOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы операторов с заказами
    """
    serializer_class = OrderForOperatorSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # Отключаем пагинацию для простоты
    
    def get_queryset(self):
        """Получение заказов для оператора"""
        import logging
        logger = logging.getLogger(__name__)
        operator = self.request.user
        
        # Получаем зоны оператора
        operator_zones = operator.assigned_zones.filter(is_active=True)
        if not operator_zones.exists():
            logger.warning(f"⚠️ Operator {operator.username} has no active zones")
            return Order.objects.none()
        
        # Создаем список городов из зон оператора
        operator_cities = list(operator_zones.values_list('city', flat=True).distinct())
        logger.info(f"🔍 Operator {operator.username} zones: {operator_cities}")
        
        # Базовый queryset - заказы в зонах оператора
        # Для доставки: по адресу клиента, для самовывоза: по городу ресторана
        from django.db.models import Q
        
        # Сначала получаем все заказы в городах оператора
        base_queryset = Order.objects.filter(
            Q(service_type='delivery', address__city__in=operator_cities) |  # Доставка: только по адресу клиента
            Q(service_type='pickup', restaurant__city__in=operator_cities)  # Самовывоз: только по городу ресторана
        )
        
        logger.info(f"🔍 Base queryset count: {base_queryset.count()}")
        logger.info(f"🔍 Delivery orders count: {base_queryset.filter(service_type='delivery').count()}")
        logger.info(f"🔍 Pickup orders count: {base_queryset.filter(service_type='pickup').count()}")
        
        # Для оптимизации, сначала получаем заказы самовывоза
        pickup_orders = base_queryset.filter(service_type='pickup')
        
        # Для заказов доставки проверяем зоны более эффективно
        delivery_orders = base_queryset.filter(service_type='delivery')
        delivery_orders_in_zones = []
        
        # Проверяем только заказы доставки
        for order in delivery_orders:
            logger.info(f"🔍 Checking delivery order #{order.id}: {order.address}")
            if not order.address:
                logger.warning(f"⚠️ Order #{order.id} has no address")
                continue
            if not order.address.latitude or not order.address.longitude:
                logger.warning(f"⚠️ Order #{order.id} address has no coordinates: lat={order.address.latitude}, lon={order.address.longitude}")
                continue
            
            # Проверяем, находится ли адрес в какой-либо зоне оператора
            for zone in operator_zones:
                is_in_zone = zone.is_address_in_zone(order.address.latitude, order.address.longitude)
                logger.info(f"🔍 Order #{order.id} in zone '{zone.name}': {is_in_zone}")
                if is_in_zone:
                    delivery_orders_in_zones.append(order.id)
                    logger.info(f"✅ Order #{order.id} added to delivery orders")
                    break
        
        # Объединяем заказы доставки в зонах и заказы самовывоза
        queryset = base_queryset.filter(
            Q(id__in=delivery_orders_in_zones) | Q(service_type='pickup')
        ).select_related(
            'user', 'address', 'restaurant', 'promo_code'
        ).prefetch_related(
            'orderitem_set__menu_item',
            'orderitem_set__size_option',
            'orderitem_set__add_ons'
        ).order_by('-created_at')  # Сортировка по дате создания (новые сверху)
        
        # Фильтрация по статусу (если указан)
        status_filter = getattr(self.request, 'query_params', {}).get('status') or self.request.GET.get('status')
        if status_filter and status_filter != 'all':
            queryset = queryset.filter(status=status_filter)
        
        # Фильтрация по зоне (если нужна)
        zone_filter = getattr(self.request, 'query_params', {}).get('zone') or self.request.GET.get('zone')
        if zone_filter and zone_filter != 'all':
            queryset = queryset.filter(address__city__iexact=zone_filter)
        
        # Фильтрация по дате (если нужна)
        date_filter = getattr(self.request, 'query_params', {}).get('date') or self.request.GET.get('date')
        if date_filter:
            try:
                date = datetime.strptime(date_filter, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date=date)
            except ValueError:
                pass
        
        # Поиск по номеру заказа, имени клиента или телефону
        search_query = getattr(self.request, 'query_params', {}).get('search') or self.request.GET.get('search')
        if search_query:
            # Убираем лишние пробелы и приводим к нижнему регистру для поиска
            search_terms = search_query.strip().lower()
            
            # Поиск по номеру заказа (точное совпадение)
            if search_terms.isdigit():
                queryset = queryset.filter(id=int(search_terms))
            else:
                # Поиск по имени клиента или телефону
                queryset = queryset.filter(
                    Q(user__first_name__icontains=search_terms) |
                    Q(user__last_name__icontains=search_terms) |
                    Q(user__username__icontains=search_terms) |
                    Q(address__phone_number__icontains=search_terms) |
                    Q(phone__icontains=search_terms)
                )
        
        # Дополнительная фильтрация по точным координатам зон
        # Оптимизированная версия - проверяем только если есть зоны с полигонами
        filtered_orders = []
        for order in queryset:
            can_handle, _ = operator.can_handle_order(order)
            if can_handle:
                filtered_orders.append(order)
        
        # Возвращаем QuerySet для совместимости с ModelViewSet
        if filtered_orders:
            order_ids = [order.id for order in filtered_orders]
            final_queryset = Order.objects.filter(id__in=order_ids).select_related(
                'user', 'address', 'restaurant', 'promo_code'
            ).prefetch_related(
                'orderitem_set__menu_item',
                'orderitem_set__size_option',
                'orderitem_set__add_ons'
            ).order_by('-created_at')
            logger.info(f"✅ Final queryset count: {final_queryset.count()}")
            logger.info(f"✅ Final order IDs: {order_ids}")
            return final_queryset
        else:
            logger.warning(f"❌ No orders found for operator {operator.username}")
            return Order.objects.none()
    
    def retrieve(self, request, pk=None):
        """Получение конкретного заказа с дополнительной диагностикой"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Сначала пытаемся получить заказ из нашего queryset
            queryset = self.get_queryset()
            order = get_object_or_404(queryset, pk=pk)
            serializer = self.get_serializer(order)
            return Response(serializer.data)
        except Exception as e:
            # Если заказ не найден в queryset, проверяем существует ли он вообще
            try:
                order = Order.objects.get(pk=pk)
                operator = request.user
                
                # Диагностика: почему заказ не входит в queryset оператора
                logger.info(f"🔍 Order #{pk} exists but not in operator queryset")
                logger.info(f"🔍 Order details: service_type={order.service_type}, address={order.address}")
                
                if order.address:
                    logger.info(f"🔍 Address details: city={order.address.city}, lat={order.address.latitude}, lon={order.address.longitude}")
                
                # Проверяем зоны оператора
                operator_zones = operator.assigned_zones.filter(is_active=True)
                logger.info(f"🔍 Operator zones: {[zone.name for zone in operator_zones]}")
                
                # Проверяем can_handle_order
                can_handle, message = operator.can_handle_order(order)
                logger.info(f"🔍 Can handle order: {can_handle}, message: {message}")
                
                return Response({
                    'error': f'Заказ #{pk} не доступен для данного оператора',
                    'details': message,
                    'order_exists': True,
                    'operator_zones': [zone.name for zone in operator_zones],
                    'order_city': order.address.city if order.address else None
                }, status=status.HTTP_403_FORBIDDEN)
                
            except Order.DoesNotExist:
                return Response({
                    'error': f'Заказ #{pk} не найден',
                    'details': 'Заказ с указанным ID не существует в системе'
                }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Дашборд оператора"""
        operator = request.user
        operator_zones = operator.assigned_zones.filter(is_active=True)
        
        # Создаем список городов из зон оператора
        operator_cities = list(operator_zones.values_list('city', flat=True).distinct())
        
        # Получаем все заказы в зонах оператора для статистики
        from django.db.models import Q
        
        # Базовая фильтрация по городам
        base_orders = Order.objects.filter(
            Q(service_type='delivery', address__city__in=operator_cities) |  # Доставка: только по адресу клиента
            Q(service_type='pickup', restaurant__city__in=operator_cities)  # Самовывоз: только по городу ресторана
        )
        
        # Дополнительная фильтрация для заказов доставки по зонам
        delivery_orders_in_zones = []
        pickup_orders = base_orders.filter(service_type='pickup')
        
        for order in base_orders.filter(service_type='delivery'):
            for zone in operator_zones:
                if order.address and order.address.latitude and order.address.longitude and zone.is_address_in_zone(order.address.latitude, order.address.longitude):
                    delivery_orders_in_zones.append(order.id)
                    break
        
        # Объединяем заказы доставки в зонах и заказы самовывоза
        all_orders = base_orders.filter(
            Q(id__in=delivery_orders_in_zones) | Q(service_type='pickup')
        )
        
        # Статистика по заказам
        total_orders = all_orders.count()
        pending_orders = all_orders.filter(status='pending').count()
        new_orders = all_orders.filter(status='new').count()
        confirmed_orders = all_orders.filter(status='confirmed').count()
        completed_orders = all_orders.filter(status='completed').count()
        cancelled_orders = all_orders.filter(status='cancelled').count()
        
        # Получаем последние заказы (все статусы)
        recent_orders = all_orders.select_related(
            'user', 'address', 'restaurant', 'promo_code'
        ).prefetch_related(
            'orderitem_set__menu_item',
            'orderitem_set__size_option',
            'orderitem_set__add_ons'
        ).order_by('-created_at')[:10]
        
        # Названия назначенных зон
        assigned_zones = [zone.name for zone in operator_zones]
        
        # Уведомления
        notifications = OperatorNotification.objects.filter(
            operator=operator,
            is_read=False
        )[:5]
        
        dashboard_data = {
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'new_orders': new_orders,
            'confirmed_orders': confirmed_orders,
            'completed_orders': completed_orders,
            'cancelled_orders': cancelled_orders,
            'assigned_zones': assigned_zones,
            'recent_orders': OrderForOperatorSerializer(recent_orders, many=True).data,
            'notifications': OperatorNotificationSerializer(notifications, many=True).data
        }
        
        return Response(dashboard_data)
    
    @action(detail=True, methods=['post'])
    def assign_to_me(self, request, pk=None):
        """Назначить заказ себе"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, может ли оператор обрабатывать заказ
        can_handle, message = operator.can_handle_order(order)
        if not can_handle:
            return Response(
                {'error': message}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, не назначен ли уже заказ
        if order.assigned_operator:
            return Response(
                {'error': 'Заказ уже назначен другому оператору'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Назначаем заказ
        order.assigned_operator = operator
        order.assigned_at = timezone.now()
        order.status = 'assigned'
        order.save()
        
        # Создаем запись о назначении
        assignment, created = OrderAssignment.objects.get_or_create(
            order=order,
            defaults={
                'operator': operator,
                'status': 'assigned'
            }
        )
        
        # Создаем уведомление
        OperatorNotification.objects.create(
            operator=operator,
            notification_type='new_order',
            title='Новый заказ назначен',
            message=f'Вам назначен заказ #{order.id}',
            order=order
        )
        
        return Response({
            'message': 'Заказ успешно назначен',
            'order': OrderForOperatorSerializer(order).data
        })
    
    
    @action(detail=True, methods=['post'])
    def call_customer(self, request, pk=None):
        """Отметить, что оператор звонил клиенту"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, назначен ли заказ оператору
        if order.assigned_operator != operator:
            return Response(
                {'error': 'Заказ не назначен вам'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Обновляем информацию о звонке
        order.operator_called = True
        order.operator_call_time = timezone.now()
        order.save()
        
        return Response({
            'message': 'Звонок отмечен',
            'order': OrderForOperatorSerializer(order).data
        })
    
    @action(detail=True, methods=['post'])
    def update_call_result(self, request, pk=None):
        """Обновить результат звонка"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, назначен ли заказ оператору
        if order.assigned_operator != operator:
            return Response(
                {'error': 'Заказ не назначен вам'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        call_result = request.data.get('call_result')
        operator_notes = request.data.get('operator_notes', '')
        
        if not call_result:
            return Response(
                {'error': 'Необходимо указать результат звонка'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем результат звонка
        order.operator_call_result = call_result
        order.operator_notes = operator_notes
        
        # Обновляем статус заказа в зависимости от результата
        if call_result == 'confirmed':
            order.status = 'confirmed'
        elif call_result == 'cancelled':
            order.status = 'cancelled'
        elif call_result == 'modified':
            order.status = 'assigned'  # Возвращаем к статусу "назначен"
        
        order.save()
        
        # Записываем в историю
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status='assigned',  # Был назначен, теперь меняем статус
            new_status=order.status,
            reason=f'Результат звонка: {call_result}'
        )
        
        return Response({
            'message': 'Результат звонка обновлен',
            'order': OrderForOperatorSerializer(order).data
        })
    
    @action(detail=True, methods=['post'])
    def add_notes(self, request, pk=None):
        """Добавить заметки к заказу"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, назначен ли заказ оператору
        if order.assigned_operator != operator:
            # Если заказ не назначен никому, автоматически назначаем текущему оператору (без изменения статуса)
            if order.assigned_operator is None:
                old_status_before = order.status
                order.assigned_operator = operator
                order.save()
                
                # Записываем в историю назначение без изменения статуса
                OrderStatusHistory.objects.create(
                    order=order,
                    operator=operator,
                    old_status=old_status_before,
                    new_status=order.status,
                    reason='Заказ автоматически назначен оператору при добавлении заметок'
                )
            else:
                return Response(
                    {'error': 'Заказ назначен другому оператору'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        notes = request.data.get('notes', '')
        if not notes:
            return Response(
                {'error': 'Необходимо указать заметки'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем заметки
        order.operator_notes = notes
        order.save()
        
        return Response({
            'message': 'Заметки добавлены',
            'order': OrderForOperatorSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def update_cart(self, request, pk=None):
        """Обновить корзину заказа оператором"""
        import logging
        logger = logging.getLogger(__name__)
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, назначен ли заказ оператору
        if order.assigned_operator != operator:
            # Если заказ не назначен, назначаем его текущему оператору
            if order.assigned_operator is None:
                old_status_before = order.status
                logger.info(f"🔄 Auto-assigning order {order.id} to operator {operator.username}. Status before: {old_status_before}")
                
                order.assigned_operator = operator
                # Не меняем статус - оставляем прежний
                order.save()
                
                logger.info(f"✅ Order {order.id} assigned. Status after save: {order.status}")
                
                # Записываем в историю назначение без изменения статуса
                OrderStatusHistory.objects.create(
                    order=order,
                    operator=operator,
                    old_status=old_status_before,
                    new_status=order.status,
                    reason='Заказ автоматически назначен оператору при редактировании корзины'
                )
                
                logger.info(f"📝 OrderStatusHistory created: {old_status_before} -> {order.status}")
            else:
                return Response(
                    {'error': 'Заказ назначен другому оператору'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Проверяем, что заказ можно редактировать
        # Разрешаем редактирование в статусах: pending, assigned, confirmed
        if order.status not in ['pending', 'assigned', 'confirmed']:
            return Response(
                {'error': f'Заказ нельзя редактировать в статусе "{order.get_status_display()}"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        cart_items = request.data.get('items', [])
        if not cart_items:
            return Response(
                {'error': 'Необходимо указать товары корзины'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Удаляем все существующие товары заказа
            OrderItem.objects.filter(order=order).delete()
            
            # Добавляем новые товары
            total_price = 0
            for item_data in cart_items:
                menu_item_id = item_data.get('menu_item_id')
                quantity = item_data.get('quantity', 1)
                size_option_id = item_data.get('size_option_id')
                addon_ids = item_data.get('addon_ids', [])
                
                if not menu_item_id:
                    continue
                
                try:
                    menu_item = MenuItem.objects.get(id=menu_item_id)
                except MenuItem.DoesNotExist:
                    continue
                
                # Создаем OrderItem
                order_item = OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    quantity=quantity
                )
                
                # Добавляем размер, если указан
                if size_option_id:
                    try:
                        size_option = SizeOption.objects.get(id=size_option_id)
                        order_item.size_option = size_option
                        order_item.save()
                    except SizeOption.DoesNotExist:
                        pass
                
                # Добавляем добавки, если указаны
                if addon_ids:
                    try:
                        addons = AddOn.objects.filter(id__in=addon_ids)
                        order_item.add_ons.set(addons)
                    except Exception:
                        pass
                
                # Рассчитываем общую стоимость
                total_price += order_item.calculate_total()
            
            # Обновляем общую стоимость заказа
            order.total_price = total_price
            order.save()
            
            # Записываем в историю
            OrderStatusHistory.objects.create(
                order=order,
                operator=operator,
                old_status=order.status,
                new_status=order.status,
                reason=f'Корзина заказа обновлена оператором {operator.first_name} (статус не изменен)'
            )
            
            # Отправляем уведомление клиенту в Telegram
            try:
                from api.tasks import send_cart_updated_notification
                send_cart_updated_notification.delay(
                    order.user.telegram_id,
                    order.id,
                    operator.first_name
                )
            except Exception as notification_error:
                logger.error(f"Failed to send cart update notification: {str(notification_error)}")
            
            logger.info(f"🎯 Cart update completed. Final order status: {order.status}")
            
            return Response({
                'message': 'Корзина заказа обновлена',
                'order': OrderForOperatorSerializer(order).data,
                'total_price': total_price
            })
            
        except Exception as e:
            logger.error(f"Error updating cart: {str(e)}", exc_info=True)
            return Response(
                {'error': 'Ошибка обновления корзины'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def confirm_order(self, request, pk=None):
        """Подтвердить заказ оператором"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, что заказ в статусе pending
        if order.status != 'pending':
            return Response(
                {'error': 'Можно подтверждать только заказы в статусе "Ожидает обработки"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем имя клиента, если указано
        customer_name = request.data.get('customer_name')
        if customer_name and customer_name.strip():
            # Обновляем имя клиента в заказе
            order.user.first_name = customer_name.strip()
            order.user.save()
        
        # Определяем ресторан в зависимости от типа заказа
        from api.models import Restaurant
        restaurant = None
        
        if order.service_type == 'pickup':
            # Для самовывоза ресторан уже должен быть указан
            if order.restaurant:
                restaurant = order.restaurant
            else:
                return Response(
                    {'error': 'Для заказа на самовывоз ресторан должен быть указан при создании'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Для доставки ресторан выбирается оператором
            restaurant_id = request.data.get('restaurant_id')
            if not restaurant_id:
                return Response(
                    {'error': 'Необходимо указать ресторан для доставки'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                restaurant = Restaurant.objects.get(id=restaurant_id, is_active=True)
            except Restaurant.DoesNotExist:
                return Response(
                    {'error': 'Ресторан не найден или неактивен'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Обновляем статус заказа
        old_status = order.status
        order.status = 'preparing'  # Меняем на "готовится" вместо "подтвержден"
        order.assigned_operator = operator
        order.assigned_at = timezone.now()
        order.operator_call_result = 'confirmed'
        order.operator_called = True
        order.operator_call_time = timezone.now()
        order.restaurant = restaurant  # Назначаем ресторан
        
        # Присваиваем номер заказа оператора
        from .models import OperatorOrderNumber
        order.operator_order_number = OperatorOrderNumber.get_next_number(operator)
        
        order.save()
        
        # Создаем запись в истории статусов
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status=old_status,
            new_status='preparing',  # Меняем на "готовится"
            reason='Заказ подтвержден оператором и передан на кухню'
        )
        
        # Создаем OrderProcessing для заказа
        from app_cashier.models import OrderProcessing, Cashier
        from app_cashier.models import CashierNotification
        
        # Находим активных кассиров ресторана
        restaurant_cashiers = Cashier.objects.filter(
            restaurant=restaurant,
            is_active_cashier=True
        )
        
        # Выбираем первого активного кассира для обработки заказа
        if restaurant_cashiers.exists():
            assigned_cashier = restaurant_cashiers.first()
            
            # Создаем OrderProcessing для заказа (только одну запись)
            order_processing, created = OrderProcessing.objects.get_or_create(
                order=order,
                defaults={
                    'cashier': assigned_cashier,
                    'status': 'received',
                    'notes': 'Заказ подтвержден оператором и передан на кухню'
                }
            )
            
            # Создаем уведомления для всех активных кассиров ресторана
            for cashier in restaurant_cashiers:
                CashierNotification.objects.create(
                    cashier=cashier,
                    notification_type='new_order',
                    title='Новый заказ для приготовления',
                    message=f'Заказ #{order.id} подтвержден оператором и передан на кухню. Сумма: {order.total_price} UZS',
                    order=order
                )
        
        return Response({
            'message': f'Заказ подтвержден и передан в ресторан "{restaurant.name}"',
            'order': OrderForOperatorSerializer(order).data
        })

    @action(detail=False, methods=['get'])
    def restaurants(self, request):
        """Получить список активных ресторанов"""
        import logging
        logger = logging.getLogger(__name__)
        from api.models import Restaurant
        
        # Получаем параметр order_id для фильтрации по зоне доставки
        order_id = request.query_params.get('order_id')
        
        if order_id:
            try:
                # Получаем заказ и его адрес
                order = Order.objects.select_related('address').get(id=order_id)
                
                # Фильтруем рестораны в зависимости от типа заказа
                if order.service_type == 'pickup':
                    # Для самовывоза показываем все активные рестораны с самовывозом
                    restaurants = Restaurant.objects.filter(
                        is_active=True,
                        pickup_available=True
                    )
                    logger.info(f"🍽️ Заказ #{order.id} на самовывоз: найдено {restaurants.count()} ресторанов с самовывозом")
                else:
                    # Для доставки фильтруем по городу заказа
                    if order.address:
                        order_city = order.address.city
                        restaurants = Restaurant.objects.filter(
                            is_active=True,
                            city__iexact=order_city
                        )
                        logger.info(f"🚚 Заказ #{order.id} на доставку в {order_city}: найдено {restaurants.count()} ресторанов")
                    else:
                        # Если адрес не указан, показываем все рестораны
                        restaurants = Restaurant.objects.filter(is_active=True)
                        logger.info(f"🚚 Заказ #{order.id} на доставку без адреса: найдено {restaurants.count()} ресторанов")
                
                # Формируем список подходящих ресторанов
                suitable_restaurants = []
                for restaurant in restaurants:
                    if order.service_type == 'pickup':
                        # Для самовывоза добавляем все рестораны без проверки зон
                        suitable_restaurants.append({
                            'id': restaurant.id,
                            'name': restaurant.name,
                            'city': restaurant.city,
                            'address': restaurant.address
                        })
                    else:
                        # Для доставки проверяем зоны доставки
                        from api.models import DeliveryZone
                        delivery_zones = DeliveryZone.objects.filter(
                            city__iexact=restaurant.city,
                            is_active=True
                        )
                        
                        if delivery_zones.exists():
                            # Проверяем, попадает ли адрес заказа в зоны доставки
                            can_deliver = False
                            if order.address and order.address.latitude and order.address.longitude:
                                for zone in delivery_zones:
                                    if order.address and order.address.latitude and order.address.longitude and zone.is_address_in_zone(order.address.latitude, order.address.longitude):
                                        can_deliver = True
                                        break
                            
                            if can_deliver:
                                suitable_restaurants.append({
                                    'id': restaurant.id,
                                    'name': restaurant.name,
                                    'city': restaurant.city,
                                    'address': restaurant.address
                                })
                        else:
                            # Если нет зон доставки, показываем все рестораны в городе
                            suitable_restaurants.append({
                                'id': restaurant.id,
                                'name': restaurant.name,
                                'city': restaurant.city,
                                'address': restaurant.address
                            })
                
                logger.info(f"✅ Возвращаем {len(suitable_restaurants)} подходящих ресторанов для заказа #{order.id}")
                return Response({
                    'restaurants': suitable_restaurants
                })
                
            except Order.DoesNotExist:
                return Response(
                    {'error': 'Заказ не найден'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Если order_id не указан, возвращаем все активные рестораны
            restaurants = Restaurant.objects.filter(is_active=True).values('id', 'name', 'city', 'address')
            return Response({
                'restaurants': list(restaurants)
            })

    @action(detail=True, methods=['post'])
    def reject_order(self, request, pk=None):
        """Отклонить заказ оператором"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, что заказ в статусе pending
        if order.status != 'pending':
            return Response(
                {'error': 'Можно отклонять только заказы в статусе "Ожидает обработки"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Получаем причину отклонения и имя клиента
        reason = request.data.get('reason', 'Отклонен оператором')
        customer_name = request.data.get('customer_name')
        
        # Обновляем имя клиента, если указано
        if customer_name and customer_name.strip():
            # Обновляем имя клиента в заказе
            order.user.first_name = customer_name.strip()
            order.user.save()
        
        # Обновляем статус заказа
        old_status = order.status
        order.status = 'rejected'
        order.assigned_operator = operator
        order.assigned_at = timezone.now()
        order.operator_call_result = 'cancelled'
        order.operator_called = True
        order.operator_call_time = timezone.now()
        order.operator_notes = reason
        order.save()
        
        # Создаем запись в истории статусов
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status=old_status,
            new_status='rejected',
            reason=f'Заказ отклонен оператором: {reason}'
        )
        
        return Response({
            'message': 'Заказ отклонен',
            'order': OrderForOperatorSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def update_customer_name(self, request, pk=None):
        """Обновить имя клиента"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Получаем новое имя клиента
        customer_name = request.data.get('customer_name')
        if not customer_name or not customer_name.strip():
            return Response(
                {'error': 'Необходимо указать имя клиента'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем имя клиента
        old_name = f"{order.user.first_name} {order.user.last_name or ''}".strip()
        order.user.first_name = customer_name.strip()
        order.user.save()
        
        # Создаем запись в истории статусов
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status=order.status,
            new_status=order.status,
            reason=f'Имя клиента изменено с "{old_name}" на "{customer_name.strip()}"'
        )
        
        return Response({
            'message': 'Имя клиента обновлено',
            'order': OrderForOperatorSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def update_payment_method(self, request, pk=None):
        """Обновить способ оплаты заказа"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Получаем новый способ оплаты
        payment_method = request.data.get('payment_method')
        if not payment_method or payment_method not in ['cash', 'card', 'online']:
            return Response(
                {'error': 'Необходимо указать корректный способ оплаты (cash, card, online)'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, назначен ли заказ оператору
        if order.assigned_operator != operator:
            # Если заказ не назначен, назначаем его текущему оператору
            if order.assigned_operator is None:
                old_status_before = order.status
                
                order.assigned_operator = operator
                order.save()
                
                # Записываем в историю назначение без изменения статуса
                OrderStatusHistory.objects.create(
                    order=order,
                    operator=operator,
                    old_status=old_status_before,
                    new_status=order.status,
                    reason='Заказ автоматически назначен оператору при изменении способа оплаты'
                )
            else:
                return Response(
                    {'error': 'Заказ назначен другому оператору'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Проверяем, что заказ можно редактировать
        if order.status not in ['pending', 'assigned', 'confirmed']:
            return Response(
                {'error': f'Заказ нельзя редактировать в статусе "{order.get_status_display()}"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем способ оплаты
        old_payment_method = order.payment_method
        old_payment_method_display = order.get_payment_method_display()
        order.payment_method = payment_method
        order.save()
        
        # Создаем запись в истории статусов
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status=order.status,
            new_status=order.status,
            reason=f'Способ оплаты изменен с "{old_payment_method_display}" на "{order.get_payment_method_display()}"'
        )
        
        return Response({
            'message': 'Способ оплаты обновлен',
            'order': OrderForOperatorSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def update_service_type(self, request, pk=None):
        """Обновить тип заказа (доставка ↔ самовывоз)"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Получаем новый тип заказа
        service_type = request.data.get('service_type')
        if not service_type or service_type not in ['delivery', 'pickup']:
            return Response(
                {'error': 'Необходимо указать корректный тип заказа (delivery, pickup)'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, назначен ли заказ оператору
        if order.assigned_operator != operator:
            # Если заказ не назначен, назначаем его текущему оператору
            if order.assigned_operator is None:
                old_status_before = order.status
                
                order.assigned_operator = operator
                order.save()
                
                # Записываем в историю назначение без изменения статуса
                OrderStatusHistory.objects.create(
                    order=order,
                    operator=operator,
                    old_status=old_status_before,
                    new_status=order.status,
                    reason='Заказ автоматически назначен оператору при изменении типа заказа'
                )
            else:
                return Response(
                    {'error': 'Заказ назначен другому оператору'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Проверяем, что заказ можно редактировать
        if order.status not in ['pending', 'assigned', 'confirmed']:
            return Response(
                {'error': f'Заказ нельзя редактировать в статусе "{order.get_status_display()}"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Обновляем тип заказа
        old_service_type = order.service_type
        old_service_type_display = order.get_service_type_display()
        order.service_type = service_type
        
        # Если меняем с доставки на самовывоз, очищаем адрес
        if old_service_type == 'delivery' and service_type == 'pickup':
            order.address_info = None
            order.delivery_fee = 0
        
        # Если меняем с самовывоза на доставку, нужно будет указать адрес
        elif old_service_type == 'pickup' and service_type == 'delivery':
            # Проверяем, есть ли адрес в запросе
            address_info = request.data.get('address_info')
            if not address_info:
                return Response(
                    {'error': 'При изменении на доставку необходимо указать адрес'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            order.address_info = address_info
        
        order.save()
        
        # Создаем запись в истории статусов
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status=order.status,
            new_status=order.status,
            reason=f'Тип заказа изменен с "{old_service_type_display}" на "{order.get_service_type_display()}"'
        )
        
        return Response({
            'message': 'Тип заказа обновлен',
            'order': OrderForOperatorSerializer(order).data
        })


class SearchSuggestionsView(APIView):
    """API для получения предложений поиска"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        query = request.GET.get('q', '').strip()
        if len(query) < 2:
            return Response([])
        
        operator = request.user
        suggestions = []
        
        # Получаем зоны оператора
        operator_zones = operator.assigned_zones.filter(is_active=True)
        if not operator_zones.exists():
            return Response([])
        
        operator_cities = list(operator_zones.values_list('city', flat=True).distinct())
        
        # Поиск по номеру заказа
        if query.isdigit():
            try:
                order_id = int(query)
                from django.db.models import Q
                
                orders = Order.objects.filter(
                    Q(id=order_id) & (
                        Q(service_type='delivery', address__city__in=operator_cities) |  # Доставка: только по адресу клиента
                        Q(service_type='pickup', restaurant__city__in=operator_cities)  # Самовывоз: только по городу ресторана
                    )
                ).select_related('user', 'address')[:5]
                
                for order in orders:
                    suggestions.append({
                        'id': order.id,
                        'type': 'order',
                        'title': f'Заказ #{order.id}',
                        'subtitle': f'{order.user.first_name} {order.user.last_name} - {order.address.phone_number if order.address else order.phone}',
                        'search_value': str(order.id)
                    })
            except ValueError:
                pass
        
        # Поиск по имени клиента
        users = User.objects.filter(
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(username__icontains=query)
        ).distinct()[:10]
        
        for user in users:
            # Проверяем, есть ли заказы этого пользователя в зонах оператора
            from django.db.models import Q
            
            user_orders = Order.objects.filter(
                Q(user=user) & (
                    Q(service_type='delivery', address__city__in=operator_cities) |  # Доставка: только по адресу клиента
                    Q(service_type='pickup', restaurant__city__in=operator_cities)  # Самовывоз: только по городу ресторана
                )
            ).exists()
            
            if user_orders:
                suggestions.append({
                    'id': f'user_{user.id}',
                    'type': 'customer',
                    'title': f'{user.first_name} {user.last_name}',
                    'subtitle': f'@{user.username}' if user.username else 'Пользователь',
                    'search_value': user.first_name or user.username or user.last_name
                })
        
        # Поиск по телефону
        phone_query = query.replace('+', '').replace(' ', '').replace('-', '')
        if phone_query.isdigit() and len(phone_query) >= 3:
            # Поиск в заказах
            from django.db.models import Q
            
            orders_by_phone = Order.objects.filter(
                Q(phone__icontains=phone_query) |
                Q(address__phone_number__icontains=phone_query),
                Q(service_type='delivery', address__city__in=operator_cities) |  # Доставка: только по адресу клиента
                Q(service_type='pickup', restaurant__city__in=operator_cities)  # Самовывоз: только по городу ресторана
            ).select_related('user', 'address')[:5]
            
            for order in orders_by_phone:
                phone = order.phone or (order.address.phone_number if order.address else '')
                suggestions.append({
                    'id': f'phone_{order.id}',
                    'type': 'phone',
                    'title': phone,
                    'subtitle': f'{order.user.first_name} {order.user.last_name} - Заказ #{order.id}',
                    'search_value': phone
                })
        
        # Убираем дубликаты и ограничиваем количество
        seen = set()
        unique_suggestions = []
        for suggestion in suggestions:
            key = (suggestion['type'], suggestion['title'])
            if key not in seen:
                seen.add(key)
                unique_suggestions.append(suggestion)
                if len(unique_suggestions) >= 10:
                    break
        
        return Response(unique_suggestions)
