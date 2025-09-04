from django.contrib import admin
from .models import (
    Cashier, CashierSession, OrderProcessing, 
    CashierNotification, CashierAnalytics
)

@admin.register(Cashier)
class CashierAdmin(admin.ModelAdmin):
    list_display = ['username', 'first_name', 'last_name', 'restaurant', 'is_active_cashier', 'processed_orders_count']
    list_filter = ['is_active_cashier', 'restaurant', 'created_at']
    search_fields = ['username', 'first_name', 'last_name', 'phone']
    readonly_fields = ['processed_orders_count', 'created_at', 'updated_at']

@admin.register(CashierSession)
class CashierSessionAdmin(admin.ModelAdmin):
    list_display = ['cashier', 'start_time', 'end_time', 'status', 'orders_processed']
    list_filter = ['status', 'start_time']
    search_fields = ['cashier__username', 'cashier__first_name']

@admin.register(OrderProcessing)
class OrderProcessingAdmin(admin.ModelAdmin):
    list_display = ['order', 'cashier', 'status', 'received_at', 'estimated_time']
    list_filter = ['status', 'received_at']
    search_fields = ['order__id', 'cashier__username']

@admin.register(CashierNotification)
class CashierNotificationAdmin(admin.ModelAdmin):
    list_display = ['cashier', 'title', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['cashier__username', 'title']

@admin.register(CashierAnalytics)
class CashierAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['cashier', 'date', 'total_orders', 'completed_orders', 'avg_preparation_time']
    list_filter = ['date']
    search_fields = ['cashier__username']
