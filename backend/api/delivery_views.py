from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Avg, Q, F
from django.utils import timezone
from datetime import timedelta

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
