from django.urls import path
from . import delivery_views

urlpatterns = [
    # Курьеры
    path('drivers/', delivery_views.DeliveryDriverListCreateView.as_view(), name='delivery-driver-list-create'),
    path('drivers/<int:pk>/', delivery_views.DeliveryDriverDetailView.as_view(), name='delivery-driver-detail'),
    path('drivers/<int:driver_id>/status/', delivery_views.update_driver_status, name='update-driver-status'),
    path('drivers/<int:driver_id>/assignments/', delivery_views.driver_assignments, name='driver-assignments'),
    
    # Назначения
    path('assignments/', delivery_views.DeliveryAssignmentListCreateView.as_view(), name='delivery-assignment-list-create'),
    path('assignments/<int:pk>/', delivery_views.DeliveryAssignmentDetailView.as_view(), name='delivery-assignment-detail'),
    path('assignments/<int:assignment_id>/status/', delivery_views.update_assignment_status, name='update-assignment-status'),
    
    # Заказы
    path('orders/available/', delivery_views.available_orders, name='available-orders'),
    path('orders/<int:order_id>/assignments/', delivery_views.order_assignments, name='order-assignments'),
    
    # Утилиты
    path('drivers/available/', delivery_views.available_drivers, name='available-drivers'),
    path('assign/', delivery_views.assign_order_to_driver, name='assign-order-to-driver'),
    path('stats/', delivery_views.delivery_stats, name='delivery-stats'),
]




