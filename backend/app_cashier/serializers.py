from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Cashier, CashierSession, OrderProcessing, CashierNotification, CashierAnalytics, CashierToken


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
                if hasattr(user, 'cashier') and user.cashier.is_active_cashier:
                    attrs['user'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Кассир неактивен')
            else:
                raise serializers.ValidationError('Неверные учетные данные')
        else:
            raise serializers.ValidationError('Необходимо указать username и password')