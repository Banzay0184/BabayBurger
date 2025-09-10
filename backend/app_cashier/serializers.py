from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from rest_framework.authtoken.models import Token
from .models import (
    Cashier, CashierSession, OrderProcessing, 
    CashierNotification, CashierAnalytics
)
from api.models import Order, Restaurant

class CashierRegistrationSerializer(serializers.ModelSerializer):
    """Сериализатор для регистрации кассира"""
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    restaurant_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Cashier
        fields = [
            'username', 'email', 'first_name', 'last_name', 
            'phone', 'restaurant_id', 'password', 'password_confirm'
        ]
        extra_kwargs = {
            'email': {'required': True},
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Пароли не совпадают")
        
        # Проверяем, что ресторан существует
        try:
            restaurant = Restaurant.objects.get(id=attrs['restaurant_id'], is_active=True)
        except Restaurant.DoesNotExist:
            raise serializers.ValidationError("Ресторан не найден или неактивен")
        
        attrs['restaurant'] = restaurant
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        validated_data.pop('restaurant_id')
        
        # Убеждаемся, что пароль будет хеширован
        password = validated_data.pop('password', None)
        if password:
            cashier = Cashier.objects.create_user(password=password, **validated_data)
        else:
            cashier = Cashier.objects.create_user(**validated_data)
        
        return cashier

class CashierLoginSerializer(serializers.Serializer):
    """Сериализатор для входа кассира"""
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            # Ищем кассира напрямую в модели Cashier
            cleaned_username = str(username).strip()
            try:
                cashier = Cashier.objects.get(username__iexact=cleaned_username)
            except Cashier.DoesNotExist:
                raise serializers.ValidationError({'username': ['Пользователь не найден']})

            if not cashier.check_password(password):
                raise serializers.ValidationError({'password': ['Неверный пароль']})
            if not cashier.is_active:
                raise serializers.ValidationError({'non_field_errors': ['Аккаунт кассира деактивирован']})
            if not cashier.is_active_cashier:
                raise serializers.ValidationError({'non_field_errors': ['Кассир неактивен']})

            attrs['cashier'] = cashier
            return attrs
        else:
            raise serializers.ValidationError('Необходимо указать имя пользователя и пароль')

class CashierProfileSerializer(serializers.ModelSerializer):
    """Сериализатор для профиля кассира"""
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    restaurant_city = serializers.CharField(source='restaurant.city', read_only=True)
    formatted_phone = serializers.CharField(read_only=True)
    
    class Meta:
        model = Cashier
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone', 'formatted_phone', 'restaurant', 'restaurant_name', 
            'restaurant_city', 'is_active_cashier', 'processed_orders_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'username', 'created_at', 'updated_at']

class CashierSessionSerializer(serializers.ModelSerializer):
    """Сериализатор для сессий кассира"""
    duration = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = CashierSession
        fields = [
            'id', 'start_time', 'end_time', 'status', 
            'orders_processed', 'notes', 'duration'
        ]
        read_only_fields = ['id', 'start_time', 'end_time']

class OrderProcessingSerializer(serializers.ModelSerializer):
    """Сериализатор для обработки заказов"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    order_status = serializers.CharField(source='order.status', read_only=True)
    order_total = serializers.DecimalField(source='order.total_price', max_digits=10, decimal_places=2, read_only=True)
    customer_name = serializers.CharField(source='order.user.first_name', read_only=True)
    customer_phone = serializers.CharField(source='order.phone', read_only=True)
    service_type = serializers.CharField(source='order.service_type', read_only=True)
    
    class Meta:
        model = OrderProcessing
        fields = [
            'id', 'order_id', 'order_status', 'order_total', 
            'customer_name', 'customer_phone', 'service_type',
            'received_at', 'started_preparing_at', 'ready_at', 
            'completed_at', 'status', 'notes', 'estimated_time'
        ]
        read_only_fields = [
            'id', 'order_id', 'order_status', 'order_total',
            'customer_name', 'customer_phone', 'service_type',
            'received_at', 'started_preparing_at', 'ready_at', 'completed_at'
        ]

class OrderForCashierSerializer(serializers.ModelSerializer):
    """Сериализатор для заказов в интерфейсе кассира"""
    user_info = serializers.SerializerMethodField()
    address_info = serializers.SerializerMethodField()
    restaurant_info = serializers.SerializerMethodField()
    items_details = serializers.SerializerMethodField()
    processing_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'user_info', 'address_info', 'restaurant_info',
            'items_details', 'total_price', 'delivery_fee', 'discount_amount',
            'final_price', 'status', 'service_type', 'payment_method',
            'created_at', 'notes', 'processing_info', 'operator_order_number', 'phone'
        ]
    
    def get_user_info(self, obj):
        return {
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'username': obj.user.username,
        }
    
    def get_address_info(self, obj):
        if obj.address:
            return {
                'full_address': obj.address.full_address,
                'city': obj.address.city,
                'phone_number': obj.address.phone_number,
                'latitude': obj.address.latitude,
                'longitude': obj.address.longitude,
            }
        return None
    
    def get_restaurant_info(self, obj):
        if obj.restaurant:
            return {
                'id': obj.restaurant.id,
                'name': obj.restaurant.name,
                'address': obj.restaurant.address,
                'city': obj.restaurant.city,
            }
        return None
    
    def get_items_details(self, obj):
        items = []
        for order_item in obj.orderitem_set.all():
            item_data = {
                'menu_item_name': order_item.menu_item.name,
                'quantity': order_item.quantity,
                'unit_price': order_item.menu_item.price,
                'total_price': order_item.calculate_total(),
            }
            
            if order_item.size_option:
                item_data['size_option'] = {
                    'name': order_item.size_option.name,
                    'price_modifier': order_item.size_option.price_modifier,
                }
                item_data['size_option_name'] = order_item.size_option.name
            
            if order_item.add_ons.exists():
                item_data['add_ons'] = [
                    {
                        'name': addon.name,
                        'price': addon.price,
                    }
                    for addon in order_item.add_ons.all()
                ]
                item_data['add_ons_names'] = [addon.name for addon in order_item.add_ons.all()]
            
            items.append(item_data)
        return items
    
    def get_processing_info(self, obj):
        if hasattr(obj, 'cashier_processing'):
            processing = obj.cashier_processing
            return {
                'status': processing.status,
                'received_at': processing.received_at,
                'started_preparing_at': processing.started_preparing_at,
                'ready_at': processing.ready_at,
                'completed_at': processing.completed_at,
                'estimated_time': processing.estimated_time,
                'notes': processing.notes,
            }
        return None

class CashierNotificationSerializer(serializers.ModelSerializer):
    """Сериализатор для уведомлений кассира"""
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    
    class Meta:
        model = CashierNotification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'order_id', 'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class CashierAnalyticsSerializer(serializers.ModelSerializer):
    """Сериализатор для аналитики кассира"""
    
    class Meta:
        model = CashierAnalytics
        fields = [
            'id', 'date', 'total_orders', 'completed_orders',
            'cancelled_orders', 'avg_preparation_time', 'total_revenue'
        ]
        read_only_fields = ['id']

class OrderStatusChangeSerializer(serializers.Serializer):
    """Сериализатор для изменения статуса заказа"""
    status = serializers.ChoiceField(choices=[
        ('preparing', 'Готовится'),
        ('ready_for_delivery', 'Готов к доставке'),
        ('completed', 'Завершен'),
        ('cancelled', 'Отменен'),
    ])
    notes = serializers.CharField(required=False, allow_blank=True)
    estimated_time = serializers.IntegerField(required=False, min_value=1, max_value=300)
    
    def validate_status(self, value):
        # Получаем заказ из контекста
        order = self.context.get('order')
        if not order:
            raise serializers.ValidationError("Заказ не найден в контексте")
        
        # Проверяем текущий статус заказа
        current_status = order.status
        valid_transitions = {
            'preparing': ['preparing', 'ready_for_delivery', 'cancelled'],
            'ready_for_delivery': ['completed', 'cancelled'],
            'completed': [],  # Завершенный заказ нельзя изменить
            'cancelled': [],  # Отмененный заказ нельзя изменить
        }
        
        if current_status not in valid_transitions:
            raise serializers.ValidationError(f"Нельзя изменить статус заказа из '{current_status}'")
        
        if value not in valid_transitions[current_status]:
            raise serializers.ValidationError(
                f"Нельзя изменить статус с '{current_status}' на '{value}'"
            )
        
        return value
