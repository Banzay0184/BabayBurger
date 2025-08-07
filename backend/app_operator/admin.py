from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Avg
from .models import (
    Operator, OperatorSession, OrderAssignment, 
    OrderStatusHistory, OperatorNotification, OperatorAnalytics
)

@admin.register(Operator)
class OperatorAdmin(UserAdmin):
    """
    Админ-панель для операторов
    """
    list_display = [
        'username', 'first_name', 'last_name', 'phone', 
        'is_active_operator', 'completed_orders_count',
        'assigned_zones_count'
    ]
    list_filter = [
        'is_active_operator', 'is_staff', 'is_superuser',
        'assigned_zones', 'created_at'
    ]
    search_fields = ['username', 'first_name', 'last_name', 'phone', 'email']
    ordering = ['-completed_orders_count']
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Личная информация', {
            'fields': ('first_name', 'last_name', 'email', 'phone', 'telegram_id')
        }),
        ('Статус оператора', {
            'fields': ('is_active_operator', 'completed_orders_count')
        }),
        ('Зоны доставки', {
            'fields': ('assigned_zones',)
        }),
        ('Разрешения', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Важные даты', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'first_name', 'last_name', 
                      'email', 'phone', 'is_active_operator', 'assigned_zones'),
        }),
    )
    
    def assigned_zones_count(self, obj):
        """Количество назначенных зон"""
        return obj.assigned_zones.count()
    assigned_zones_count.short_description = 'Зоны доставки'

@admin.register(OperatorSession)
class OperatorSessionAdmin(admin.ModelAdmin):
    """
    Админ-панель для сессий операторов
    """
    list_display = [
        'operator', 'start_time', 'end_time', 'status', 
        'orders_handled', 'avg_delivery_time_formatted',
        'duration_formatted'
    ]
    list_filter = ['status', 'start_time', 'operator']
    search_fields = ['operator__username', 'operator__first_name', 'operator__last_name']
    readonly_fields = ['start_time', 'end_time']
    ordering = ['-start_time']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('operator', 'status', 'start_time', 'end_time')
        }),
        ('Статистика', {
            'fields': ('orders_handled', 'avg_delivery_time_formatted')
        }),
        ('Заметки', {
            'fields': ('notes',)
        }),
    )
    
    def avg_delivery_time_formatted(self, obj):
        """Форматированное среднее время доставки"""
        try:
            avg_time = obj.avg_delivery_time
            if avg_time > 0:
                return f"{avg_time:.1f} мин"
            return "Нет данных"
        except:
            return "Ошибка"
    avg_delivery_time_formatted.short_description = 'Среднее время доставки'
    
    def duration_formatted(self, obj):
        """Форматированная длительность сессии"""
        try:
            minutes = obj.duration
            if minutes <= 0:
                return "0 мин"
            hours = minutes // 60
            remaining_minutes = minutes % 60
            if hours > 0:
                return f"{hours}ч {remaining_minutes}мин"
            else:
                return f"{remaining_minutes}мин"
        except:
            return "Ошибка"
    duration_formatted.short_description = 'Длительность'

@admin.register(OrderAssignment)
class OrderAssignmentAdmin(admin.ModelAdmin):
    """
    Админ-панель для назначений заказов
    """
    list_display = [
        'order_link', 'operator', 'status', 'assigned_at', 
        'accepted_at', 'delivery_time_formatted'
    ]
    list_filter = ['status', 'assigned_at', 'operator', 'order__status']
    search_fields = [
        'order__id', 'operator__username', 'operator__first_name', 
        'operator__last_name', 'order__address__street'
    ]
    readonly_fields = ['assigned_at', 'accepted_at']
    ordering = ['-assigned_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('order', 'operator', 'status')
        }),
        ('Временные метки', {
            'fields': ('assigned_at', 'accepted_at')
        }),
        ('Дополнительная информация', {
            'fields': ('notes', 'rejection_reason')
        }),
    )
    
    def order_link(self, obj):
        """Ссылка на заказ"""
        if obj.order:
            url = reverse('admin:api_order_change', args=[obj.order.id])
            return format_html('<a href="{}">Заказ #{}</a>', url, obj.order.id)
        return "Нет заказа"
    order_link.short_description = 'Заказ'
    order_link.admin_order_field = 'order__id'
    
    def delivery_time_formatted(self, obj):
        """Форматированное время доставки"""
        if obj.accepted_at and obj.order.status == 'completed':
            delivery_time = (obj.order.updated_at - obj.accepted_at).total_seconds() / 60
            return f"{delivery_time:.1f} мин"
        return "Не завершен"
    delivery_time_formatted.short_description = 'Время доставки'

@admin.register(OrderStatusHistory)
class OrderStatusHistoryAdmin(admin.ModelAdmin):
    """
    Админ-панель для истории изменений статуса заказов
    """
    list_display = [
        'order_link', 'operator', 'old_status', 'new_status', 
        'changed_at', 'reason_short'
    ]
    list_filter = ['new_status', 'changed_at', 'operator']
    search_fields = [
        'order__id', 'operator__username', 'operator__first_name', 
        'operator__last_name', 'reason'
    ]
    readonly_fields = ['changed_at']
    ordering = ['-changed_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('order', 'operator', 'old_status', 'new_status')
        }),
        ('Дополнительная информация', {
            'fields': ('changed_at', 'reason')
        }),
    )
    
    def order_link(self, obj):
        """Ссылка на заказ"""
        if obj.order:
            url = reverse('admin:api_order_change', args=[obj.order.id])
            return format_html('<a href="{}">Заказ #{}</a>', url, obj.order.id)
        return "Нет заказа"
    order_link.short_description = 'Заказ'
    order_link.admin_order_field = 'order__id'
    
    def reason_short(self, obj):
        """Краткая причина изменения"""
        if obj.reason:
            return obj.reason[:50] + "..." if len(obj.reason) > 50 else obj.reason
        return "Нет причины"
    reason_short.short_description = 'Причина'

@admin.register(OperatorNotification)
class OperatorNotificationAdmin(admin.ModelAdmin):
    """
    Админ-панель для уведомлений операторов
    """
    list_display = [
        'operator', 'notification_type', 'title', 'is_read', 
        'created_at', 'order_link'
    ]
    list_filter = ['notification_type', 'is_read', 'created_at', 'operator']
    search_fields = [
        'operator__username', 'operator__first_name', 'operator__last_name',
        'title', 'message', 'order__id'
    ]
    readonly_fields = ['created_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('operator', 'notification_type', 'title', 'message')
        }),
        ('Связанный заказ', {
            'fields': ('order',)
        }),
        ('Статус', {
            'fields': ('is_read', 'created_at')
        }),
    )
    
    def order_link(self, obj):
        """Ссылка на заказ"""
        if obj.order:
            url = reverse('admin:api_order_change', args=[obj.order.id])
            return format_html('<a href="{}">Заказ #{}</a>', url, obj.order.id)
        return "Нет заказа"
    order_link.short_description = 'Заказ'
    order_link.admin_order_field = 'order__id'

@admin.register(OperatorAnalytics)
class OperatorAnalyticsAdmin(admin.ModelAdmin):
    """
    Админ-панель для аналитики операторов
    """
    list_display = [
        'operator', 'date', 'total_orders', 'completed_orders', 
        'cancelled_orders', 'completion_rate',
        'total_earnings'
    ]
    list_filter = ['date', 'operator']
    search_fields = [
        'operator__username', 'operator__first_name', 'operator__last_name'
    ]
    readonly_fields = [
        'total_orders', 'completed_orders', 'cancelled_orders',
        'total_earnings'
    ]
    ordering = ['-date', 'operator']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('operator', 'date')
        }),
        ('Статистика заказов', {
            'fields': ('total_orders', 'completed_orders', 'cancelled_orders')
        }),
        ('Финансы', {
            'fields': ('total_earnings',)
        }),
    )
    
    def completion_rate(self, obj):
        """Процент выполнения заказов"""
        if obj.total_orders > 0:
            rate = (obj.completed_orders / obj.total_orders) * 100
            return f"{rate:.1f}%"
        return "0%"
    completion_rate.short_description = 'Процент выполнения'
    
    def get_queryset(self, request):
        """Оптимизация запросов"""
        return super().get_queryset(request).select_related('operator')
