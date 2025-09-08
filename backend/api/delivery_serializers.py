from rest_framework import serializers
from .models import DeliveryDriver, DeliveryAssignment, Order, User


class DeliveryDriverSerializer(serializers.ModelSerializer):
    """Сериализатор для курьеров доставки"""
    user_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = DeliveryDriver
        fields = [
            'id', 'user_name', 'telegram_id', 'phone', 'status', 'status_display',
            'is_active', 'max_orders', 'current_orders_count', 'rating',
            'total_deliveries', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_orders_count', 'total_deliveries']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class DeliveryDriverCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания курьера"""
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    username = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = DeliveryDriver
        fields = [
            'telegram_id', 'phone', 'first_name', 'last_name', 'username',
            'max_orders', 'is_active'
        ]
    
    def create(self, validated_data):
        # Извлекаем данные пользователя
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name', '')
        username = validated_data.pop('username', f"driver_{validated_data['telegram_id']}")
        
        # Создаем пользователя
        user = User.objects.create(
            first_name=first_name,
            last_name=last_name,
            username=username,
            telegram_id=validated_data['telegram_id']
        )
        
        # Создаем курьера
        validated_data['user'] = user
        driver = DeliveryDriver.objects.create(**validated_data)
        
        return driver


class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    """Сериализатор для назначений доставки"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_total = serializers.DecimalField(source='order.final_price', max_digits=10, decimal_places=2, read_only=True)
    order_address = serializers.CharField(source='order.address_info.full_address', read_only=True)
    order_phone = serializers.CharField(source='order.phone', read_only=True)
    order_customer_name = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = DeliveryAssignment
        fields = [
            'id', 'order_id', 'order_total', 'order_address', 'order_phone',
            'order_customer_name', 'driver_name', 'status', 'status_display',
            'assigned_at', 'accepted_at', 'picked_up_at', 'delivered_at',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'assigned_at', 'accepted_at', 'picked_up_at', 'delivered_at',
            'created_at', 'updated_at'
        ]
    
    def get_order_customer_name(self, obj):
        return f"{obj.order.user_info.first_name} {obj.order.user_info.last_name}".strip()
    
    def get_driver_name(self, obj):
        return f"{obj.driver.user.first_name} {obj.driver.user.last_name}".strip()


class DeliveryAssignmentCreateSerializer(serializers.ModelSerializer):
    """Сериализатор для создания назначения доставки"""
    
    class Meta:
        model = DeliveryAssignment
        fields = ['order', 'driver', 'notes']
    
    def validate(self, data):
        order = data['order']
        driver = data['driver']
        
        # Проверяем, что заказ на доставку
        if order.service_type != 'delivery':
            raise serializers.ValidationError("Можно назначать только заказы на доставку")
        
        # Проверяем, что курьер может взять заказ
        if not driver.can_take_order():
            raise serializers.ValidationError("Курьер не может взять больше заказов")
        
        # Проверяем, что заказ еще не назначен
        if DeliveryAssignment.objects.filter(order=order, status__in=['assigned', 'accepted', 'picked_up', 'delivering']).exists():
            raise serializers.ValidationError("Заказ уже назначен курьеру")
        
        return data


class DeliveryStatsSerializer(serializers.Serializer):
    """Сериализатор для статистики доставки"""
    total_drivers = serializers.IntegerField()
    active_drivers = serializers.IntegerField()
    busy_drivers = serializers.IntegerField()
    offline_drivers = serializers.IntegerField()
    total_assignments = serializers.IntegerField()
    pending_assignments = serializers.IntegerField()
    completed_assignments = serializers.IntegerField()
    cancelled_assignments = serializers.IntegerField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)


class OrderForDeliverySerializer(serializers.ModelSerializer):
    """Сериализатор для заказов на доставку"""
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.CharField(source='phone', read_only=True)
    address = serializers.CharField(source='address_info.full_address', read_only=True)
    items_count = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'customer_name', 'customer_phone', 'address',
            'final_price', 'delivery_fee', 'items_count',
            'payment_method', 'payment_method_display',
            'service_type', 'service_type_display',
            'notes', 'created_at'
        ]
    
    def get_customer_name(self, obj):
        return f"{obj.user_info.first_name} {obj.user_info.last_name}".strip()
    
    def get_items_count(self, obj):
        return obj.items_details.count() if hasattr(obj, 'items_details') else 0




