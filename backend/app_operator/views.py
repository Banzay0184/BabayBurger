from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from django.contrib.auth import authenticate, login, logout
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
    DeliveryZoneSerializer, OrderMapLocationSerializer
)
from api.models import Order, DeliveryZone

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
            token, created = Token.objects.get_or_create(user=operator)
            
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
            token, created = Token.objects.get_or_create(user=operator)
            
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
            Token.objects.filter(user=request.user).delete()
            logout(request)
            return Response({'message': 'Успешный выход'}, status=status.HTTP_200_OK)
        
        return Response({'message': 'Не авторизован'}, status=status.HTTP_401_UNAUTHORIZED)

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
