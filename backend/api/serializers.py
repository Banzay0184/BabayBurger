from rest_framework import serializers
from .models import User, MenuItem, AddOn, SizeOption, Promotion, Order, OrderItem, Category, Address, DeliveryZone, Favorite
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
        
        # Координаты необязательны - будут заполнены автоматически
        if not data.get('latitude') and not data.get('longitude'):
            data['latitude'] = None
            data['longitude'] = None
        
        # Проверяем зону доставки после создания адреса
        # Это будет выполнено в методе save() модели Address
        return data

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'image']

class AddOnSerializer(serializers.ModelSerializer):
    available_for_categories = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=Category.objects.all(), 
        required=False
    )
    
    class Meta:
        model = AddOn
        fields = ['id', 'name', 'price', 'category', 'available_for_categories', 'is_active']

class SizeOptionSerializer(serializers.ModelSerializer):
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
    size_options = SizeOptionSerializer(many=True, read_only=True)
    add_on_options = AddOnSerializer(many=True, read_only=True)
    
    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'price', 'category', 'image', 'created_at',
            'is_hit', 'is_new', 'priority', 'size_options', 'add_on_options'
        ]

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
            'id', 'user', 'items', 'total_price', 'status', 'address',
            'created_at', 'updated_at', 'promotion', 'delivery_fee', 
            'discounted_total', 'delivery_time', 'notes'
        ]

class OrderCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания заказа"""
    class Meta:
        model = Order
        fields = ['total_price', 'address', 'delivery_time', 'notes']

class DeliveryZoneSerializer(serializers.ModelSerializer):
    """Сериализатор для зон доставки"""
    class Meta:
        model = DeliveryZone
        fields = [
            'id', 'name', 'city', 'center_latitude', 'center_longitude',
            'radius_km', 'delivery_fee', 'min_order_amount', 'is_active', 
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