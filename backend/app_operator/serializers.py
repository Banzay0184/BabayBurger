from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import (
    Operator, OperatorSession, OrderAssignment, OrderStatusHistory, 
    OperatorOrderNumber, OperatorNotification, OperatorAnalytics
)
from api.models import Order, OrderItem
from api.serializers import OrderItemSerializer


class OperatorSerializer(serializers.ModelSerializer):
    """Сериализатор для модели Operator"""
    formatted_phone = serializers.ReadOnlyField()
    assigned_zones_names = serializers.ReadOnlyField()

    class Meta:
        model = Operator
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'phone', 'formatted_phone',
            'is_active_operator', 'assigned_zones', 'assigned_zones_names', 'telegram_id',
            'completed_orders_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'completed_orders_count', 'created_at', 'updated_at']


class OperatorSessionSerializer(serializers.ModelSerializer):
    """Сериализатор для модели OperatorSession"""
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)
    duration = serializers.ReadOnlyField()
    avg_delivery_time = serializers.ReadOnlyField()

    class Meta:
        model = OperatorSession
        fields = [
            'id', 'operator', 'operator_name', 'start_time', 'end_time', 'status',
            'orders_handled', 'notes', 'duration', 'avg_delivery_time'
        ]
        read_only_fields = ['id', 'start_time']


class OrderAssignmentSerializer(serializers.ModelSerializer):
    """Сериализатор для модели OrderAssignment"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)
    order_total = serializers.DecimalField(source='order.final_price', max_digits=10, decimal_places=2, read_only=True)
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)

    class Meta:
        model = OrderAssignment
        fields = [
            'id', 'order', 'order_id', 'order_status', 'order_total', 'operator', 'operator_name',
            'assigned_at', 'accepted_at', 'status', 'notes', 'rejection_reason'
        ]
        read_only_fields = ['id', 'assigned_at']


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    """Сериализатор для модели OrderStatusHistory"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)

    class Meta:
        model = OrderStatusHistory
        fields = [
            'id', 'order', 'order_id', 'operator', 'operator_name', 'old_status', 'new_status',
            'changed_at', 'reason'
        ]
        read_only_fields = ['id', 'changed_at']


class OperatorOrderNumberSerializer(serializers.ModelSerializer):
    """Сериализатор для модели OperatorOrderNumber"""
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)
    
    class Meta:
        model = OperatorOrderNumber
        fields = [
            'id', 'operator', 'operator_name', 'date', 'last_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OperatorNotificationSerializer(serializers.ModelSerializer):
    """Сериализатор для модели OperatorNotification"""
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)

    class Meta:
        model = OperatorNotification
        fields = [
            'id', 'operator', 'operator_name', 'notification_type', 'title', 'message',
            'order', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class OperatorAnalyticsSerializer(serializers.ModelSerializer):
    """Сериализатор для модели OperatorAnalytics"""
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)

    class Meta:
        model = OperatorAnalytics
        fields = [
            'id', 'operator', 'operator_name', 'date', 'total_orders', 'completed_orders',
            'cancelled_orders', 'total_delivery_time', 'avg_delivery_time', 'total_earnings'
        ]
        read_only_fields = ['id']


class OperatorAuthSerializer(serializers.Serializer):
    """Сериализатор для аутентификации оператора"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if hasattr(user, 'operator') and user.operator.is_active_operator:
                    attrs['user'] = user
                    return attrs
                else:
                    raise serializers.ValidationError('Оператор неактивен')
            else:
                raise serializers.ValidationError('Неверные учетные данные')
        else:
            raise serializers.ValidationError('Необходимо указать username и password')


class OrderForOperatorSerializer(serializers.ModelSerializer):
    """Сериализатор для заказа, оптимизированный для операторов"""
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
            'payment_method', 'payment_status', 'items', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']