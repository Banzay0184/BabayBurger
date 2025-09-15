from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Cashier, CashierSession, OrderProcessing, CashierNotification, CashierAnalytics, CashierToken
from api.models import Order, OrderItem
from api.serializers import OrderItemSerializer


class CashierSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Cashier"""
    formatted_phone = serializers.ReadOnlyField()
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    restaurant_city = serializers.CharField(source='restaurant.city', read_only=True)
    
    class Meta:
        model = Cashier
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone', 'formatted_phone',
            'restaurant', 'restaurant_name', 'restaurant_city', 'is_active_cashier',
            'telegram_id', 'processed_orders_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'processed_orders_count', 'created_at', 'updated_at']


class CashierSessionSerializer(serializers.ModelSerializer):
    """Сериализатор для модели CashierSession"""
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    duration = serializers.ReadOnlyField()
    
    class Meta:
        model = CashierSession
        fields = [
            'id', 'cashier', 'cashier_name', 'start_time', 'end_time', 'status',
            'orders_processed', 'notes', 'duration'
        ]
        read_only_fields = ['id', 'start_time']


class OrderProcessingSerializer(serializers.ModelSerializer):
    """Сериализатор для модели OrderProcessing"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)
    order_total = serializers.DecimalField(source='order.final_price', max_digits=10, decimal_places=2, read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    
    class Meta:
        model = OrderProcessing
        fields = [
            'id', 'order', 'order_id', 'order_status', 'order_total', 'cashier', 'cashier_name',
            'received_at', 'started_preparing_at', 'ready_at', 'completed_at', 'status',
            'notes', 'estimated_time'
        ]
        read_only_fields = ['id', 'received_at']


class CashierNotificationSerializer(serializers.ModelSerializer):
    """Сериализатор для модели CashierNotification"""
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    
    class Meta:
        model = CashierNotification
        fields = [
            'id', 'cashier', 'cashier_name', 'notification_type', 'title', 'message',
            'order', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CashierAnalyticsSerializer(serializers.ModelSerializer):
    """Сериализатор для модели CashierAnalytics"""
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    
    class Meta:
        model = CashierAnalytics
        fields = [
            'id', 'cashier', 'cashier_name', 'date', 'total_orders', 'completed_orders',
            'cancelled_orders', 'avg_preparation_time', 'total_revenue'
        ]
        read_only_fields = ['id']


class CashierTokenSerializer(serializers.ModelSerializer):
    """Сериализатор для модели CashierToken"""
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)
    
    class Meta:
        model = CashierToken
        fields = ['key', 'cashier', 'cashier_name', 'created']
        read_only_fields = ['key', 'created']


class CashierAuthSerializer(serializers.Serializer):
    """Сериализатор для аутентификации кассира"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                # Поскольку Cashier наследуется от AbstractUser,
                # user уже является экземпляром Cashier
                if hasattr(user, 'is_active_cashier') and user.is_active_cashier:
                    attrs['cashier'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Кассир неактивен')
            else:
                raise serializers.ValidationError('Неверные учетные данные')
        else:
            raise serializers.ValidationError('Необходимо указать username и password')


class CashierRegistrationSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации кассира"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = Cashier
        fields = [
            'username', 'email', 'first_name', 'last_name', 'phone', 
            'restaurant', 'password', 'password_confirm'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError('Пароли не совпадают')
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = Cashier.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CashierLoginSerializer(serializers.Serializer):
    """Сериализатор для входа кассира"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                # Поскольку Cashier наследуется от AbstractUser,
                # user уже является экземпляром Cashier
                if hasattr(user, 'is_active_cashier') and user.is_active_cashier:
                    attrs['cashier'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Кассир неактивен')
            else:
                raise serializers.ValidationError('Неверные учетные данные')
        else:
            raise serializers.ValidationError('Необходимо указать username и password')


class OrderForCashierSerializer(serializers.ModelSerializer):
    """Сериализатор для заказа, оптимизированный для кассиров"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    address_text = serializers.CharField(source='address.address', read_only=True)
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    promo_code_code = serializers.CharField(source='promo_code.code', read_only=True)
    items = OrderItemSerializer(source='orderitem_set', many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_name', 'user_phone', 'address', 'address_text',
            'restaurant', 'restaurant_name', 'promo_code', 'promo_code_code',
            'total_price', 'final_price', 'delivery_fee', 'status', 'status_display',
            'payment_method', 'items', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CashierProfileSerializer(serializers.ModelSerializer):
    """Сериализатор для профиля кассира"""
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    
    class Meta:
        model = Cashier
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone',
            'restaurant', 'restaurant_name', 'is_active_cashier', 'telegram_id',
            'processed_orders_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'processed_orders_count', 'created_at', 'updated_at']