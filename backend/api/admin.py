from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Sum, Count
from .models import User, MenuItem, Order, OrderItem, Category, Address, AddOn, SizeOption, Promotion, DeliveryZone, Favorite


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'description', 'item_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['name', 'description']
    ordering = ['name']
    
    def item_count(self, obj):
        return obj.menuitem_set.count()
    item_count.short_description = 'Товаров в категории'


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_hit', 'is_new', 'priority')
    list_filter = ('is_hit', 'is_new', 'category', 'priority')
    search_fields = ('name',)
    filter_horizontal = ('size_options', 'add_on_options')
    list_editable = ['is_hit', 'is_new', 'priority']

@admin.register(AddOn)
class AddOnAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'category', 'is_active')
    list_filter = ('is_active', 'category')
    search_fields = ('name',)
    filter_horizontal = ('available_for_categories',)

@admin.register(SizeOption)
class SizeOptionAdmin(admin.ModelAdmin):
    list_display = ('name', 'price_modifier', 'description', 'menu_item', 'is_active')
    list_filter = ('is_active', 'menu_item')
    search_fields = ('name', 'description')

@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_type', 'discount_value', 'max_discount', 'usage_count', 'max_uses', 'is_active', 'valid_from', 'valid_to')
    list_filter = ('is_active', 'discount_type')
    search_fields = ('name', 'description')
    filter_horizontal = ('applicable_items',)
    readonly_fields = ['usage_count']


@admin.register(Favorite)
class FavoriteAdmin(admin.ModelAdmin):
    list_display = ('user', 'menu_item', 'created_at')
    list_filter = ('created_at', 'menu_item__category')
    search_fields = ('user__first_name', 'user__username', 'menu_item__name')
    ordering = ['-created_at']
    readonly_fields = ['created_at']


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ['menu_item', 'quantity', 'item_total']
    readonly_fields = ['item_total']
    
    def item_total(self, obj):
        if obj.menu_item and obj.quantity:
            return f"{obj.menu_item.price * obj.quantity} ₽"
        return "0 ₽"
    item_total.short_description = 'Сумма'


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'total_price', 'discounted_total', 'delivery_fee', 'promotion', 'delivery_time', 'created_at')
    list_filter = ('status', 'promotion', 'delivery_time')
    search_fields = ('user__first_name', 'user__username', 'notes')
    ordering = ['-created_at']
    list_editable = ['status']
    readonly_fields = ['total_price', 'created_at']
    
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'status', 'total_price', 'created_at')
        }),
        ('Доставка', {
            'fields': ('address', 'delivery_fee', 'delivery_time', 'notes')
        }),
        ('Акции', {
            'fields': ('promotion', 'discounted_total'),
            'classes': ('collapse',)
        }),
    )
    
    def user_info(self, obj):
        if obj.user:
            return f"{obj.user.first_name} (@{obj.user.username})"
        return "Неизвестный пользователь"
    user_info.short_description = 'Пользователь'
    
    def address_info(self, obj):
        if obj.address:
            return f"{obj.address.full_address[:50]}..."
        return "Адрес не указан"
    address_info.short_description = 'Адрес'
    
    def items_count(self, obj):
        return obj.orderitem_set.count()
    items_count.short_description = 'Товаров'
    
    actions = ['mark_as_preparing', 'mark_as_delivering', 'mark_as_completed', 'mark_as_cancelled']
    
    def mark_as_preparing(self, request, queryset):
        updated = queryset.update(status='preparing')
        self.message_user(request, f'{updated} заказов переведено в статус "Готовится"')
    mark_as_preparing.short_description = 'Перевести в "Готовится"'
    
    def mark_as_delivering(self, request, queryset):
        updated = queryset.update(status='delivering')
        self.message_user(request, f'{updated} заказов переведено в статус "Доставляется"')
    mark_as_delivering.short_description = 'Перевести в "Доставляется"'
    
    def mark_as_completed(self, request, queryset):
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} заказов переведено в статус "Выполнен"')
    mark_as_completed.short_description = 'Перевести в "Выполнен"'
    
    def mark_as_cancelled(self, request, queryset):
        updated = queryset.update(status='cancelled')
        self.message_user(request, f'{updated} заказов переведено в статус "Отменен"')
    mark_as_cancelled.short_description = 'Перевести в "Отменен"'


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['telegram_id', 'first_name', 'username', 'orders_count', 'total_spent', 'created_at']
    list_filter = ['created_at']
    search_fields = ['first_name', 'username', 'telegram_id']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('telegram_id', 'first_name', 'username')
        }),
        ('Дата регистрации', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
    
    def orders_count(self, obj):
        return obj.order_set.count()
    orders_count.short_description = 'Заказов'
    
    def total_spent(self, obj):
        total = obj.order_set.aggregate(total=Sum('total_price'))['total']
        return f"{total} ₽" if total else "0 ₽"
    total_spent.short_description = 'Общая сумма'


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ('order', 'menu_item', 'quantity', 'size_option')
    list_filter = ('menu_item', 'size_option')
    search_fields = ('menu_item__name',)
    ordering = ['-order__created_at']
    readonly_fields = ['item_total']
    
    def item_total(self, obj):
        if obj.menu_item and obj.quantity:
            return f"{obj.menu_item.price * obj.quantity} ₽"
        return "0 ₽"
    item_total.short_description = 'Сумма'


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['user_info', 'full_address_display', 'city', 'is_primary', 'phone_number', 'coordinates_display', 'created_at']
    list_filter = ['is_primary', 'city', 'created_at']
    search_fields = ['user__first_name', 'user__username', 'street', 'city', 'phone_number']
    ordering = ['-is_primary', '-created_at']
    list_editable = ['is_primary']
    readonly_fields = ['created_at', 'updated_at', 'full_address', 'coordinates']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'is_primary')
        }),
        ('Адрес', {
            'fields': ('street', 'house_number', 'apartment', 'city')
        }),
        ('Координаты', {
            'fields': ('latitude', 'longitude', 'coordinates'),
            'classes': ('collapse',)
        }),
        ('Дополнительно', {
            'fields': ('phone_number', 'comment')
        }),
        ('Метаданные', {
            'fields': ('created_at', 'updated_at', 'full_address'),
            'classes': ('collapse',)
        }),
    )
    
    def user_info(self, obj):
        if obj.user:
            return f"{obj.user.first_name} (@{obj.user.username})"
        return "Неизвестный пользователь"
    user_info.short_description = 'Пользователь'
    
    def full_address_display(self, obj):
        return obj.full_address[:50] + "..." if len(obj.full_address) > 50 else obj.full_address
    full_address_display.short_description = 'Полный адрес'
    
    def coordinates_display(self, obj):
        if obj.coordinates:
            return obj.coordinates
        return "Не указаны"
    coordinates_display.short_description = 'Координаты'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(DeliveryZone)
class DeliveryZoneAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'delivery_fee', 'min_order_amount', 'radius_km', 'is_active')
    list_filter = ('is_active', 'city')
    search_fields = ('name', 'city')
    ordering = ['city', 'name']
    list_editable = ['delivery_fee', 'min_order_amount', 'is_active']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'city', 'is_active')
        }),
        ('География', {
            'fields': ('polygon_coordinates',),
            'description': 'Задайте координаты полигона для точных границ зоны'
        }),
        ('Стилизация полигона', {
            'fields': (
                'polygon_fill_color', 'polygon_fill_opacity',
                'polygon_stroke_color', 'polygon_stroke_width', 'polygon_stroke_opacity'
            ),
            'description': 'Настройте внешний вид полигона на карте'
        }),
        ('Стоимость доставки', {
            'fields': ('delivery_fee', 'min_order_amount')
        }),
    )
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'polygon_coordinates' in form.base_fields:
            form.base_fields['polygon_coordinates'].help_text = (
                'Введите координаты в формате: [[широта, долгота], [широта, долгота], ...]'
            )
        return form


# Настройка админ-панели
admin.site.site_header = "StreetBurger Админ-панель"
admin.site.site_title = "StreetBurger"
admin.site.index_title = "Управление рестораном"
