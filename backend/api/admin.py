from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Sum, Count
from .models import User, MenuItem, Order, OrderItem, Category, Address, AddOn, SizeOption, Promotion, DeliveryZone, Favorite, Restaurant, PromoCode, PromoCodeUsage, DeliveryDriver, DeliveryAssignment


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
    list_display = ('name', 'price', 'get_categories', 'is_active')
    list_filter = ('is_active', 'available_for_categories')
    search_fields = ('name',)
    filter_horizontal = ('available_for_categories',)
    readonly_fields = ('get_categories_display',)
    fields = ('name', 'price', 'available_for_categories', 'get_categories_display', 'is_active')
    
    def get_categories(self, obj):
        """Отображает категории дополнения в админке"""
        categories = obj.available_for_categories.all()
        if categories:
            return ', '.join([cat.name for cat in categories])
        return 'Не привязано к категориям'
    get_categories.short_description = 'Категории'
    
    def get_categories_display(self, obj):
        """Отображает категории в детальном виде"""
        categories = obj.available_for_categories.all()
        if categories:
            return ', '.join([f"{cat.name} (ID: {cat.id})" for cat in categories])
        return 'Не привязано к категориям'
    get_categories_display.short_description = 'Привязанные категории'

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
    list_display = ('id', 'user', 'restaurant_info', 'status', 'service_type_display', 'total_price', 'discounted_total', 'delivery_fee', 'promotion', 'delivery_time', 'created_at')
    list_filter = ('status', 'service_type', 'promotion', 'delivery_time')
    search_fields = ('user__first_name', 'user__username', 'restaurant__name', 'notes')
    ordering = ['-created_at']
    list_editable = ['status']
    readonly_fields = ['total_price', 'created_at', 'discount_amount', 'final_price']
    
    inlines = [OrderItemInline]
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'restaurant', 'status', 'service_type', 'total_price', 'created_at')
        }),
        ('Доставка', {
            'fields': ('address', 'phone', 'delivery_fee', 'delivery_time', 'notes')
        }),
        ('Акции', {
            'fields': ('promotion', 'discounted_total'),
            'classes': ('collapse',)
        }),
        ('Промокоды', {
            'fields': ('promo_code', 'discount_amount', 'final_price'),
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
    
    def restaurant_info(self, obj):
        if obj.restaurant:
            return f"{obj.restaurant.name} ({obj.restaurant.city})"
        return "Ресторан не указан"
    restaurant_info.short_description = 'Ресторан'
    
    def service_type_display(self, obj):
        service_type_map = {
            'delivery': '🚚 Доставка',
            'pickup': '🏪 Самовывоз'
        }
        return service_type_map.get(obj.service_type, obj.service_type)
    service_type_display.short_description = 'Тип заказа'
    
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
    list_display = ('name', 'city', 'delivery_fee', 'min_order_amount', 'is_active')
    list_filter = ('is_active', 'city')
    search_fields = ('name', 'city')
    ordering = ['city', 'name']
    list_editable = ['delivery_fee', 'min_order_amount', 'is_active']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'city', 'is_active')
        }),
        ('Доставка', {
            'fields': ('delivery_fee', 'min_order_amount'),
            'description': 'Настройки для доставки'
        }),
        ('География доставки', {
            'fields': ('polygon_coordinates',),
            'description': 'Задайте координаты полигона для точных границ зоны доставки'
        }),
        ('Стилизация полигона', {
            'fields': (
                'polygon_fill_color', 'polygon_fill_opacity',
                'polygon_stroke_color', 'polygon_stroke_width', 'polygon_stroke_opacity'
            ),
            'description': 'Настройте внешний вид полигона на карте'
        }),
    )
    
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'polygon_coordinates' in form.base_fields:
            form.base_fields['polygon_coordinates'].help_text = (
                'Введите координаты в формате: [[широта, долгота], [широта, долгота], ...]'
            )
        return form


@admin.register(Restaurant)
class RestaurantAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'address', 'pickup_available', 'min_order_amount', 'has_telegram_group', 'is_active')
    list_filter = ('is_active', 'pickup_available', 'city')
    search_fields = ('name', 'address', 'city', 'telegram_group_id')
    ordering = ['city', 'name']
    list_editable = ['pickup_available', 'min_order_amount', 'is_active']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('name', 'address', 'city', 'is_active')
        }),
        ('Координаты', {
            'fields': ('latitude', 'longitude'),
            'description': 'Координаты ресторана на карте'
        }),
        ('Самовывоз', {
            'fields': ('pickup_available', 'min_order_amount', 'pickup_time'),
            'description': 'Настройки для самовывоза'
        }),
        ('Telegram уведомления', {
            'fields': ('telegram_group_id',),
            'description': 'ID группы Telegram для уведомлений о заказах (например: -1001234567890)'
        }),
        ('Дополнительно', {
            'fields': ('phone', 'working_hours', 'description'),
            'description': 'Дополнительная информация о ресторане'
        }),
    )
    
    def has_telegram_group(self, obj):
        return bool(obj.telegram_group_id)
    has_telegram_group.boolean = True
    has_telegram_group.short_description = 'Telegram группа'


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ['code', 'discount_percent', 'max_discount', 'min_order_amount', 'is_active', 'max_uses', 'usage_count', 'expires_at', 'created_at']
    list_filter = ['is_active', 'discount_percent', 'created_at', 'expires_at']
    search_fields = ['code']
    readonly_fields = ['created_at', 'usage_count']
    fieldsets = (
        ('Основная информация', {
            'fields': ('code', 'discount_percent', 'max_discount', 'min_order_amount')
        }),
        ('Статус', {
            'fields': ('is_active', 'max_uses')
        }),
        ('Время', {
            'fields': ('created_at', 'expires_at')
        }),
    )
    
    def usage_count(self, obj):
        """Показывает количество использований промокода"""
        return PromoCodeUsage.objects.filter(promo_code=obj).count()
    usage_count.short_description = 'Использований'


@admin.register(PromoCodeUsage)
class PromoCodeUsageAdmin(admin.ModelAdmin):
    list_display = ['promo_code', 'user', 'used_at']
    list_filter = ['used_at', 'promo_code']
    search_fields = ['promo_code__code', 'user__first_name', 'user__telegram_id']
    readonly_fields = ['used_at']
    ordering = ['-used_at']


@admin.register(DeliveryDriver)
class DeliveryDriverAdmin(admin.ModelAdmin):
    list_display = ['user_name', 'phone', 'status', 'is_active', 'current_orders_count', 'max_orders', 'rating', 'total_deliveries', 'created_at']
    list_filter = ['status', 'is_active', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'phone', 'telegram_id']
    list_editable = ['status', 'is_active', 'max_orders']
    readonly_fields = ['current_orders_count', 'total_deliveries', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('user', 'telegram_id', 'phone')
        }),
        ('Статус и настройки', {
            'fields': ('status', 'is_active', 'max_orders')
        }),
        ('Рестораны', {
            'fields': ('restaurants',),
            'description': 'Выберите рестораны, с которыми работает курьер. Если не выбрано ни одного ресторана, курьер может работать со всеми заказами.'
        }),
        ('Статистика', {
            'fields': ('current_orders_count', 'total_deliveries', 'rating'),
            'classes': ('collapse',)
        }),
        ('Временные метки', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()
    user_name.short_description = 'Имя курьера'


@admin.register(DeliveryAssignment)
class DeliveryAssignmentAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'driver_name', 'status', 'has_receipt', 'assigned_at', 'accepted_at', 'delivered_at']
    list_filter = ['status', 'assigned_at', 'accepted_at', 'delivered_at']
    search_fields = ['order__id', 'driver__user__first_name', 'driver__user__last_name']
    readonly_fields = ['assigned_at', 'accepted_at', 'picked_up_at', 'delivered_at', 'created_at', 'updated_at', 'receipt_photo_display']
    ordering = ['-assigned_at']
    
    fieldsets = (
        ('Основная информация', {
            'fields': ('order', 'driver', 'status')
        }),
        ('Временные метки', {
            'fields': ('assigned_at', 'accepted_at', 'picked_up_at', 'delivered_at')
        }),
        ('Фото чека', {
            'fields': ('receipt_photo_display',),
            'classes': ('collapse',)
        }),
        ('Дополнительно', {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def order_id(self, obj):
        return f"#{obj.order.id}"
    order_id.short_description = 'Заказ'
    
    def driver_name(self, obj):
        return f"{obj.driver.user.first_name} {obj.driver.user.last_name}".strip()
    driver_name.short_description = 'Курьер'
    
    def has_receipt(self, obj):
        """Показывает есть ли фото чека"""
        return bool(obj.receipt_photo)
    has_receipt.boolean = True
    has_receipt.short_description = 'Есть чек'
    
    def receipt_photo_display(self, obj):
        """Отображает фото чека в админке"""
        if obj.receipt_photo:
            return format_html(
                '<div style="margin: 10px 0;">'
                '<h4>Фото чека:</h4>'
                '<img src="{}" style="max-width: 400px; max-height: 400px; border: 1px solid #ddd; border-radius: 5px;" />'
                '<br><br>'
                '<a href="{}" target="_blank" style="color: #007cba; text-decoration: none;">'
                '🔗 Открыть в новом окне'
                '</a>'
                '</div>',
                obj.receipt_photo.url,
                obj.receipt_photo.url
            )
        return "Фото чека не загружено"
    receipt_photo_display.short_description = 'Фото чека'


# Настройка админ-панели
admin.site.site_header = "StreetBurger Админ-панель"
admin.site.site_title = "StreetBurger"
admin.site.index_title = "Управление рестораном"
