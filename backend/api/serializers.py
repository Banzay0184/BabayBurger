from rest_framework import serializers
from .models import User, MenuItem, AddOn, SizeOption, Promotion, Order, OrderItem, Category, Address, DeliveryZone, Favorite, Restaurant, PromoCode
from app_operator.models import Operator

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['telegram_id', 'username', 'first_name']

class AddressSerializer(serializers.ModelSerializer):
    """Сериализатор для новой модели Address"""
    full_address = serializers.ReadOnlyField()
    coordinates = serializers.ReadOnlyField()
    formatted_phone = serializers.ReadOnlyField()
    
    class Meta:
        model = Address
        fields = [
            'id', 'user', 'street', 'house_number', 'apartment', 'city',
            'latitude', 'longitude', 'is_primary', 'phone_number', 'formatted_phone', 'comment',
            'full_address', 'coordinates', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class AddressCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания адреса"""
    class Meta:
        model = Address
        fields = [
            'street', 'house_number', 'apartment', 'city',
            'latitude', 'longitude', 'is_primary', 'phone_number', 'comment'
        ]
    
    def validate_phone_number(self, value):
        """Дополнительная валидация номера телефона"""
        if not value:
            raise serializers.ValidationError("Номер телефона обязателен")
        return value
    
    def validate(self, data):
        """Валидация на уровне объекта"""
        # Проверяем, что если это основной адрес, то у пользователя нет других основных
        if data.get('is_primary', False):
            user = self.context.get('user')
            if user and Address.objects.filter(user=user, is_primary=True).exists():
                raise serializers.ValidationError({
                    'is_primary': 'У вас уже есть основной адрес. '
                                 'Создайте адрес как обычный, или измените существующий основной.'
                })
        
        # Проверяем дублирование адреса
        user = self.context.get('user')
        if user:
            existing_address = Address.objects.filter(
                user=user,
                street=data.get('street'),
                house_number=data.get('house_number'),
                apartment=data.get('apartment'),
                city=data.get('city', 'Ташкент')
            ).first()
            
            if existing_address:
                raise serializers.ValidationError({
                    'street': f'У вас уже есть адрес: {existing_address.full_address}. '
                             'Используйте существующий адрес или измените данные.'
                })
        
        # Координаты необязательны, но если переданы - сохраняем их
        # Убираем принудительную установку в None
        # if not data.get('latitude') and not data.get('longitude'):
        #     data['latitude'] = None
        #     data['longitude'] = None
        
        # Проверяем зону доставки после создания адреса
        # Это будет выполнено в методе save() модели Address
        return data

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'image', 'priority']

class AddOnSerializer(serializers.ModelSerializer):
    # Убираем available_for_categories из сериализации для меню, чтобы избежать дополнительных запросов
    # Это поле не используется в клиентском приложении для отображения меню
    
    class Meta:
        model = AddOn
        fields = ['id', 'name', 'price', 'is_active']

class SizeOptionSerializer(serializers.ModelSerializer):
    menu_item = serializers.PrimaryKeyRelatedField(read_only=True, allow_null=True)
    
    class Meta:
        model = SizeOption
        fields = ['id', 'name', 'price_modifier', 'description', 'menu_item', 'is_active']

class PromotionSerializer(serializers.ModelSerializer):
    applicable_items = serializers.PrimaryKeyRelatedField(many=True, queryset=MenuItem.objects.all(), required=False)
    free_item = serializers.PrimaryKeyRelatedField(queryset=MenuItem.objects.all(), required=False, allow_null=True)
    free_addon = serializers.PrimaryKeyRelatedField(queryset=AddOn.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = Promotion
        fields = [
            'id', 'name', 'description', 'discount_type', 'discount_value',
            'min_order_amount', 'max_discount', 'usage_count', 'max_uses',
            'valid_from', 'valid_to', 'is_active', 'applicable_items', 
            'free_item', 'free_addon', 'created_at', 'updated_at'
        ]

class MenuItemSerializer(serializers.ModelSerializer):
    size_options = serializers.SerializerMethodField()
    add_on_options = serializers.SerializerMethodField()
    is_available_now = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()
    
    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'price', 'category', 'image', 'created_at',
            'is_hit', 'is_new', 'is_active', 'priority',
            # Параметры доступности по времени
            'use_time_restriction', 'available_from_time', 'available_to_time',
            # Вычисляемые поля статуса доступности
            'is_available_now', 'availability_status',
            # Опции
            'size_options', 'add_on_options'
        ]
    
    def get_size_options(self, obj):
        # Используем предзагруженные данные из prefetch_related
        if hasattr(obj, '_prefetched_objects_cache') and 'size_options' in obj._prefetched_objects_cache:
            # Используем предзагруженные данные
            active_sizes = [size for size in obj._prefetched_objects_cache['size_options'] if size.is_active]
        else:
            # Fallback для случаев без prefetch_related
            many_to_many_sizes = obj.size_options.filter(is_active=True)
            direct_sizes = SizeOption.objects.filter(menu_item=obj, is_active=True)
            active_sizes = (many_to_many_sizes | direct_sizes).distinct()
        
        return SizeOptionSerializer(active_sizes, many=True).data
    
    def get_add_on_options(self, obj):
        # Используем предзагруженные данные из prefetch_related
        if hasattr(obj, '_prefetched_objects_cache') and 'add_on_options' in obj._prefetched_objects_cache:
            # Используем предзагруженные данные
            active_addons = [addon for addon in obj._prefetched_objects_cache['add_on_options'] if addon.is_active]
        else:
            # Fallback для случаев без prefetch_related
            active_addons = obj.add_on_options.filter(is_active=True)
        
        return AddOnSerializer(active_addons, many=True).data

    def get_is_available_now(self, obj):
        try:
            return bool(obj.is_available_now())
        except Exception:
            # В случае любых ошибок считаем доступным (как в модели, когда нет ограничений)
            return True

    def get_availability_status(self, obj):
        try:
            return obj.get_availability_status()
        except Exception:
            return "Доступен всегда"

class OrderItemSerializer(serializers.ModelSerializer):
    menu_item = MenuItemSerializer(read_only=True)
    size_option = SizeOptionSerializer(read_only=True)
    add_ons = AddOnSerializer(many=True, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'menu_item', 'quantity', 'size_option', 'add_ons']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source='orderitem_set', many=True, read_only=True)
    promotion = PromotionSerializer(read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'restaurant', 'items', 'total_price', 'status', 'service_type', 'payment_method', 'address',
            'phone', 'created_at', 'updated_at', 'promotion', 'delivery_fee', 
            'discounted_total', 'delivery_time', 'notes', 'promo_code',
            'discount_amount', 'final_price'
        ]

class OrderCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания заказа"""
    class Meta:
        model = Order
        fields = ['total_price', 'address', 'phone', 'delivery_time', 'notes', 'service_type', 'payment_method', 'restaurant']

class DeliveryZoneSerializer(serializers.ModelSerializer):
    """Сериализатор для зон доставки"""
    class Meta:
        model = DeliveryZone
        fields = [
            'id', 'name', 'city', 'delivery_fee', 'min_order_amount', 'is_active',
            'polygon_coordinates', 'polygon_fill_color', 'polygon_fill_opacity',
            'polygon_stroke_color', 'polygon_stroke_width', 'polygon_stroke_opacity'
        ]


class RestaurantSerializer(serializers.ModelSerializer):
    """Сериализатор для ресторанов"""
    class Meta:
        model = Restaurant
        fields = [
            'id', 'name', 'address', 'city', 'latitude', 'longitude',
            'pickup_available', 'min_order_amount', 'pickup_time',
            'phone', 'working_hours', 'description', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class AddressDeliveryZoneSerializer(serializers.ModelSerializer):
    """Сериализатор для проверки адреса в зоне доставки"""
    delivery_zone_info = serializers.SerializerMethodField()
    is_in_delivery_zone = serializers.SerializerMethodField()
    
    class Meta:
        model = Address
        fields = [
            'id', 'full_address', 'city', 'latitude', 'longitude',
            'is_in_delivery_zone', 'delivery_zone_info'
        ]
    
    def get_is_in_delivery_zone(self, obj):
        """Проверяет, находится ли адрес в зоне доставки"""
        is_in_zone, message = obj.is_in_delivery_zone()
        return {
            'is_in_zone': is_in_zone,
            'message': message
        }
    
    def get_delivery_zone_info(self, obj):
        """Возвращает информацию о зонах доставки для города"""
        return obj.get_delivery_zones_info()

class FavoriteSerializer(serializers.ModelSerializer):
    """Сериализатор для избранных товаров"""
    menu_item = MenuItemSerializer(read_only=True)
    
    class Meta:
        model = Favorite
        fields = ['id', 'menu_item', 'created_at']
        read_only_fields = ['created_at']

class FavoriteCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания избранного товара"""
    class Meta:
        model = Favorite
        fields = ['menu_item']
    
    def validate_menu_item(self, value):
        """Проверяем, что товар активен"""
        if not value.is_active:
            raise serializers.ValidationError("Нельзя добавить в избранное неактивный товар")
        return value

class PromoCodeSerializer(serializers.ModelSerializer):
    """Сериализатор для промокодов"""
    
    class Meta:
        model = PromoCode
        fields = ['id', 'code', 'discount_percent', 'max_discount', 'min_order_amount', 'is_active', 'expires_at']
        read_only_fields = ['id', 'is_active', 'expires_at']

class PromoCodeValidationSerializer(serializers.Serializer):
    """Сериализатор для валидации промокода"""
    code = serializers.CharField(max_length=20)
    order_amount = serializers.DecimalField(max_digits=10, decimal_places=2)

class PromoCodeResponseSerializer(serializers.Serializer):
    """Сериализатор для ответа по промокоду"""
    is_valid = serializers.BooleanField()
    message = serializers.CharField()
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    discount_percent = serializers.IntegerField(required=False)
    final_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)