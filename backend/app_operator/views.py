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
            operator = serializer.validated_data['operator']
            
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
                'operator': OperatorProfileSerializer(operator).data
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
        queryset = Order.objects.filter(
            address__city__in=operator_zones.values_list('city', flat=True)
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
        
        return Order.objects.filter(
            address__city__in=operator_zones.values_list('city', flat=True),
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
        operator = self.request.user
        
        # Получаем зоны оператора
        operator_zones = operator.assigned_zones.filter(is_active=True)
        if not operator_zones.exists():
            return Order.objects.none()
        
        # Создаем список городов из зон оператора
        operator_cities = list(operator_zones.values_list('city', flat=True).distinct())
        
        # Базовый queryset - все заказы в зонах оператора
        queryset = Order.objects.filter(
            address__city__in=operator_cities
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
            return Order.objects.filter(id__in=order_ids).select_related(
                'user', 'address', 'restaurant', 'promo_code'
            ).prefetch_related(
                'orderitem_set__menu_item',
                'orderitem_set__size_option',
                'orderitem_set__add_ons'
            ).order_by('-created_at')
        else:
            return Order.objects.none()
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Дашборд оператора"""
        operator = request.user
        operator_zones = operator.assigned_zones.filter(is_active=True)
        
        # Создаем список городов из зон оператора
        operator_cities = list(operator_zones.values_list('city', flat=True).distinct())
        
        # Получаем все заказы в зонах оператора для статистики
        all_orders = Order.objects.filter(
            address__city__in=operator_cities
        )
        
        # Статистика по заказам
        total_orders = all_orders.count()
        pending_orders = all_orders.filter(status='pending').count()
        new_orders = all_orders.filter(status='new').count()
        processing_orders = all_orders.filter(status='operator_processing').count()
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
            'processing_orders': processing_orders,
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
    def start_processing(self, request, pk=None):
        """Начать обработку заказа"""
        order = get_object_or_404(Order, pk=pk)
        operator = request.user
        
        # Проверяем, назначен ли заказ оператору
        if order.assigned_operator != operator:
            return Response(
                {'error': 'Заказ не назначен вам'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Обновляем статус
        order.status = 'operator_processing'
        order.save()
        
        # Обновляем назначение
        try:
            assignment = OrderAssignment.objects.get(order=order)
            assignment.status = 'accepted'
            assignment.accepted_at = timezone.now()
            assignment.save()
        except OrderAssignment.DoesNotExist:
            pass
        
        # Записываем в историю
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status='assigned',
            new_status='operator_processing',
            reason='Оператор начал обработку'
        )
        
        return Response({
            'message': 'Обработка заказа начата',
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
            order.status = 'operator_processing'
        
        order.save()
        
        # Записываем в историю
        OrderStatusHistory.objects.create(
            order=order,
            operator=operator,
            old_status='operator_processing',
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
            return Response(
                {'error': 'Заказ не назначен вам'}, 
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
        
        # Получаем ресторан из запроса
        restaurant_id = request.data.get('restaurant_id')
        if not restaurant_id:
            return Response(
                {'error': 'Необходимо указать ресторан для доставки'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Проверяем, что ресторан существует и активен
        from api.models import Restaurant
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
        
        return Response({
            'message': f'Заказ подтвержден и передан в ресторан "{restaurant.name}"',
            'order': OrderForOperatorSerializer(order).data
        })

    @action(detail=False, methods=['get'])
    def restaurants(self, request):
        """Получить список активных ресторанов"""
        from api.models import Restaurant
        
        # Получаем параметр order_id для фильтрации по зоне доставки
        order_id = request.query_params.get('order_id')
        
        if order_id:
            try:
                # Получаем заказ и его адрес
                order = Order.objects.select_related('address').get(id=order_id)
                order_city = order.address.city
                order_latitude = order.address.latitude
                order_longitude = order.address.longitude
                
                # Фильтруем рестораны по городу заказа
                restaurants = Restaurant.objects.filter(
                    is_active=True,
                    city__iexact=order_city
                )
                
                # Дополнительно проверяем зоны доставки для каждого ресторана
                suitable_restaurants = []
                for restaurant in restaurants:
                    # Проверяем, есть ли зоны доставки в городе ресторана
                    from api.models import DeliveryZone
                    delivery_zones = DeliveryZone.objects.filter(
                        city__iexact=restaurant.city,
                        is_active=True
                    )
                    
                    if delivery_zones.exists():
                        # Проверяем, попадает ли адрес заказа в зоны доставки
                        can_deliver = False
                        for zone in delivery_zones:
                            if zone.is_address_in_zone(order_latitude, order_longitude):
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
                orders = Order.objects.filter(
                    id=order_id,
                    address__city__in=operator_cities
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
            user_orders = Order.objects.filter(
                user=user,
                address__city__in=operator_cities
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
            orders_by_phone = Order.objects.filter(
                Q(phone__icontains=phone_query) |
                Q(address__phone_number__icontains=phone_query),
                address__city__in=operator_cities
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
