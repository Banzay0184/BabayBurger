from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, timedelta
from .models import (
    Operator, OperatorSession, OrderAssignment, 
    OrderStatusHistory, OperatorNotification, OperatorAnalytics
)
from api.models import Order, DeliveryZone, Address, User, MenuItem, OrderItem

class OperatorRegistrationSerializer(serializers.ModelSerializer):
    """
    Сериализатор для регистрации операторов
    """
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        help_text="Минимум 8 символов"
    )
    
    password_confirm = serializers.CharField(
        write_only=True,
        help_text="Подтвердите пароль"
    )
    
    phone = serializers.CharField(
        validators=[UniqueValidator(queryset=Operator.objects.all())],
        help_text="Уникальный номер телефона"
    )

    class Meta:
        model = Operator
        fields = [
            'username', 'first_name', 'last_name', 'email', 
            'phone', 'password', 'password_confirm'
        ]
        extra_kwargs = {
            'username': {'help_text': 'Уникальное имя пользователя'},
            'first_name': {'help_text': 'Имя оператора'},
            'last_name': {'help_text': 'Фамилия оператора'},
            'email': {'help_text': 'Email оператора'},
        }

    def validate(self, attrs):
        """Валидация данных регистрации"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Пароли не совпадают")
        
        # Проверяем уникальность username
        if Operator.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует")
        
        return attrs

    def create(self, validated_data):
        """Создание нового оператора"""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        operator = Operator.objects.create(**validated_data)
        operator.set_password(password)
        operator.save()
        
        return operator

class OperatorLoginSerializer(serializers.Serializer):
    """
    Сериализатор для входа операторов
    """
    username = serializers.CharField(help_text="Имя пользователя или номер телефона")
    password = serializers.CharField(help_text="Пароль")

    def validate(self, attrs):
        """Валидация данных входа"""
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            # Пытаемся найти оператора по username или phone
            try:
                operator = Operator.objects.get(
                    Q(username=username) | Q(phone=username)
                )
            except Operator.DoesNotExist:
                raise serializers.ValidationError("Неверные учетные данные")
            
            # Проверяем пароль
            if not operator.check_password(password):
                raise serializers.ValidationError("Неверные учетные данные")
            
            # Проверяем активность оператора
            if not operator.is_active_operator:
                raise serializers.ValidationError("Оператор неактивен")
            
            attrs['operator'] = operator
            return attrs
        else:
            raise serializers.ValidationError("Необходимо указать имя пользователя и пароль")

class OperatorProfileSerializer(serializers.ModelSerializer):
    """
    Сериализатор для профиля оператора
    """
    assigned_zones = serializers.SerializerMethodField()
    current_session = serializers.SerializerMethodField()
    today_stats = serializers.SerializerMethodField()

    class Meta:
        model = Operator
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'phone', 'is_active_operator', 'assigned_zones',
            'completed_orders_count', 'telegram_id',
            'current_session', 'today_stats', 'created_at'
        ]
        read_only_fields = [
            'id', 'completed_orders_count', 'created_at'
        ]

    def get_assigned_zones(self, obj):
        """Получает назначенные зоны доставки"""
        zones = obj.assigned_zones.filter(is_active=True)
        return [
            {
                'id': zone.id,
                'name': zone.name,
                'city': zone.city,
                'delivery_fee': float(zone.delivery_fee)
            }
            for zone in zones
        ]

    def get_current_session(self, obj):
        """Получает текущую активную сессию"""
        try:
            session = obj.sessions.filter(status='active').latest('start_time')
            return {
                'id': session.id,
                'start_time': session.start_time,
                'duration': session.duration,
                'orders_handled': session.orders_handled
            }
        except OperatorSession.DoesNotExist:
            return None

    def get_today_stats(self, obj):
        """Получает статистику за сегодня"""
        today = timezone.now().date()
        try:
            analytics = obj.analytics.get(date=today)
            return {
                'total_orders': analytics.total_orders,
                'completed_orders': analytics.completed_orders,
                'avg_delivery_time': analytics.avg_delivery_time
            }
        except OperatorAnalytics.DoesNotExist:
            return {
                'total_orders': 0,
                'completed_orders': 0,
                'avg_delivery_time': 0
            }

class OperatorSessionSerializer(serializers.ModelSerializer):
    """
    Сериализатор для сессий операторов
    """
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)
    duration_formatted = serializers.SerializerMethodField()

    class Meta:
        model = OperatorSession
        fields = [
            'id', 'operator', 'operator_name', 'start_time', 'end_time',
            'status', 'orders_handled', 'total_delivery_time', 'avg_delivery_time',
            'duration', 'duration_formatted', 'notes'
        ]
        read_only_fields = ['operator', 'start_time', 'end_time', 'duration']

    def get_duration_formatted(self, obj):
        """Форматированная длительность сессии"""
        minutes = obj.duration
        hours = minutes // 60
        remaining_minutes = minutes % 60
        return f"{hours}ч {remaining_minutes}мин"

    def create(self, validated_data):
        """Создание новой сессии"""
        operator = self.context['request'].user
        validated_data['operator'] = operator
        
        # Проверяем, нет ли уже активной сессии
        if OperatorSession.objects.filter(operator=operator, status='active').exists():
            raise serializers.ValidationError("У вас уже есть активная сессия")
        
        return super().create(validated_data)

class OrderAssignmentSerializer(serializers.ModelSerializer):
    """
    Сериализатор для назначений заказов
    """
    order_details = serializers.SerializerMethodField()
    operator_name = serializers.CharField(source='operator.get_full_name', read_only=True)
    can_handle = serializers.SerializerMethodField()

    class Meta:
        model = OrderAssignment
        fields = [
            'id', 'order', 'order_details', 'operator', 'operator_name',
            'assigned_at', 'accepted_at', 'status', 'notes', 'rejection_reason',
            'can_handle'
        ]
        read_only_fields = ['operator', 'assigned_at', 'accepted_at']

    def get_order_details(self, obj):
        """Получает детали заказа"""
        order = obj.order
        return {
            'id': order.id,
            'total_price': float(order.total_price) if order.total_price else 0.0,
            'discounted_total': float(order.discounted_total) if order.discounted_total else 0.0,
            'status': order.status,
            'created_at': order.created_at,
            'delivery_fee': float(order.delivery_fee) if order.delivery_fee else 0.0,
            'notes': order.notes,
            'address': {
                'street': order.address.street,
                'house_number': order.address.house_number,
                'apartment': order.address.apartment,
                'city': order.address.city,
                'phone_number': order.address.formatted_phone,
                'latitude': float(order.address.latitude) if order.address.latitude else None,
                'longitude': float(order.address.longitude) if order.address.longitude else None,
            },
            'items_count': order.orderitem_set.count(),
            'items': [
                {
                    'menu_item_name': item.menu_item.name,
                    'quantity': item.quantity,
                    'size_option': item.size_option.name if item.size_option else None,
                    'add_ons': [addon.name for addon in item.add_ons.all()]
                }
                for item in order.orderitem_set.all()
            ]
        }

    def get_can_handle(self, obj):
        """Проверяет, может ли оператор обрабатывать заказ"""
        operator = self.context['request'].user
        can_handle, message = operator.can_handle_order(obj.order)
        return {
            'can_handle': can_handle,
            'message': message
        }

    def validate_order(self, value):
        """Валидация заказа"""
        # Проверяем, что заказ еще не назначен
        if OrderAssignment.objects.filter(order=value).exists():
            raise serializers.ValidationError("Заказ уже назначен оператору")
        
        # Проверяем статус заказа
        if value.status not in ['pending', 'preparing']:
            raise serializers.ValidationError("Заказ не может быть назначен в текущем статусе")
        
        return value

class OrderStatusChangeSerializer(serializers.Serializer):
    """
    Сериализатор для изменения статуса заказа
    """
    new_status = serializers.ChoiceField(
        choices=Order.STATUS_CHOICES,
        help_text="Новый статус заказа"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Причина изменения статуса"
    )

    def validate_new_status(self, value):
        """Валидация нового статуса"""
        order = self.context['order']
        current_status = order.status
        
        # Проверяем допустимые переходы статусов
        valid_transitions = {
            'pending': ['preparing', 'cancelled'],
            'preparing': ['delivering', 'cancelled'],
            'delivering': ['completed', 'cancelled'],
            'completed': [],  # Завершенный заказ нельзя изменить
            'cancelled': []   # Отмененный заказ нельзя изменить
        }
        
        if value not in valid_transitions.get(current_status, []):
            raise serializers.ValidationError(
                f"Недопустимый переход статуса с '{current_status}' на '{value}'"
            )
        
        return value

    def update(self, instance, validated_data):
        """Обновление статуса заказа"""
        old_status = instance.status
        new_status = validated_data['new_status']
        reason = validated_data.get('reason', '')
        operator = self.context['request'].user
        
        # Обновляем статус заказа
        instance.status = new_status
        instance.save()
        
        # Создаем запись в истории
        OrderStatusHistory.objects.create(
            order=instance,
            operator=operator,
            old_status=old_status,
            new_status=new_status,
            reason=reason
        )
        
        # Если заказ завершен, обновляем статистику оператора
        if new_status == 'completed':
            assignment = instance.assignment
            if assignment and assignment.status == 'accepted':
                assignment.complete_assignment()
                assignment.save()
                
                # Обновляем статистику оператора
                operator.completed_orders_count += 1
                if assignment.accepted_at:
                    delivery_time = (instance.updated_at - assignment.accepted_at).total_seconds() / 60
                    operator.avg_delivery_time = (
                        (operator.avg_delivery_time * (operator.completed_orders_count - 1) + delivery_time) /
                        operator.completed_orders_count
                    )
                operator.save()
        
        return instance

class OrderListSerializer(serializers.ModelSerializer):
    """
    Сериализатор для списка заказов
    """
    assignment = OrderAssignmentSerializer(read_only=True)
    address_summary = serializers.SerializerMethodField()
    items_summary = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'total_price', 'discounted_total', 'status', 'created_at',
            'delivery_fee', 'notes', 'assignment', 'address_summary', 'items_summary'
        ]

    def get_address_summary(self, obj):
        """Краткая информация об адресе"""
        address = obj.address
        return {
            'full_address': address.full_address,
            'phone': address.formatted_phone,
            'coordinates': address.coordinates
        }

    def get_items_summary(self, obj):
        """Краткая информация о товарах"""
        items = obj.orderitem_set.all()
        return [
            {
                'name': item.menu_item.name,
                'quantity': item.quantity,
                'total': float(item.calculate_total()) if hasattr(item, 'calculate_total') else 0.0
            }
            for item in items
        ]

class OperatorNotificationSerializer(serializers.ModelSerializer):
    """
    Сериализатор для уведомлений операторов
    """
    notification_type_display = serializers.CharField(
        source='get_notification_type_display',
        read_only=True
    )

    class Meta:
        model = OperatorNotification
        fields = [
            'id', 'notification_type', 'notification_type_display',
            'title', 'message', 'order', 'is_read', 'created_at'
        ]
        read_only_fields = ['operator', 'created_at']

class OperatorAnalyticsSerializer(serializers.ModelSerializer):
    """
    Сериализатор для аналитики операторов
    """
    date_formatted = serializers.SerializerMethodField()
    completion_rate = serializers.SerializerMethodField()

    class Meta:
        model = OperatorAnalytics
        fields = [
            'id', 'date', 'date_formatted', 'total_orders', 'completed_orders',
            'cancelled_orders', 'total_delivery_time', 'avg_delivery_time',
            'total_earnings', 'completion_rate'
        ]

    def get_date_formatted(self, obj):
        """Форматированная дата"""
        return obj.date.strftime('%d.%m.%Y')

    def get_completion_rate(self, obj):
        """Процент выполнения заказов"""
        if obj.total_orders > 0:
            return round((obj.completed_orders / obj.total_orders) * 100, 1)
        return 0

class DeliveryZoneSerializer(serializers.ModelSerializer):
    """
    Сериализатор для зон доставки
    """
    class Meta:
        model = DeliveryZone
        fields = [
            'id', 'name', 'city', 'center_latitude', 'center_longitude',
            'radius_km', 'delivery_fee', 'min_order_amount', 'is_active'
        ]

class OrderMapLocationSerializer(serializers.ModelSerializer):
    """
    Сериализатор для местоположения заказа на карте
    """
    address_coordinates = serializers.SerializerMethodField()
    delivery_zone = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'address_coordinates', 'delivery_zone']

    def get_address_coordinates(self, obj):
        """Координаты адреса доставки"""
        address = obj.address
        return {
            'latitude': float(address.latitude) if address.latitude else None,
            'longitude': float(address.longitude) if address.longitude else None,
            'address': address.full_address
        }

    def get_delivery_zone(self, obj):
        """Информация о зоне доставки"""
        address = obj.address
        zones = DeliveryZone.objects.filter(
            city__iexact=address.city,
            is_active=True
        )
        
        for zone in zones:
            if zone.is_address_in_zone(address.latitude, address.longitude):
                return {
                    'id': zone.id,
                    'name': zone.name,
                    'delivery_fee': float(zone.delivery_fee)
                }
        
        return None


# Новые сериализаторы для операторов
class OrderItemDetailSerializer(serializers.ModelSerializer):
    """Детали товара в заказе для оператора"""
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)
    menu_item_price = serializers.DecimalField(source='menu_item.price', max_digits=10, decimal_places=2, read_only=True)
    size_option_name = serializers.CharField(source='size_option.name', read_only=True)
    add_ons_names = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = OrderItem
        fields = [
            'id', 'menu_item_name', 'menu_item_price', 'quantity',
            'size_option_name', 'add_ons_names', 'total_price'
        ]
    
    def get_add_ons_names(self, obj):
        return [addon.name for addon in obj.add_ons.all()]
    
    def get_total_price(self, obj):
        if hasattr(obj, 'calculate_total'):
            return float(obj.calculate_total())
        return 0.0

class OrderForOperatorSerializer(serializers.ModelSerializer):
    """Заказ для оператора с деталями"""
    user_info = serializers.SerializerMethodField()
    address_info = serializers.SerializerMethodField()
    restaurant_info = serializers.SerializerMethodField()
    items_details = serializers.SerializerMethodField()
    delivery_zone_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    operator_call_result_display = serializers.CharField(source='get_operator_call_result_display', read_only=True)
    
    class Meta:
        model = Order
        fields = [
            'id', 'status', 'status_display', 'service_type', 'service_type_display',
            'payment_method', 'payment_method_display', 'total_price', 'final_price', 
            'delivery_fee', 'discount_amount', 'created_at', 'delivery_time', 'notes', 
            'operator_notes', 'operator_called', 'operator_call_time', 'operator_call_result',
            'operator_call_result_display', 'assigned_operator', 'assigned_at',
            'operator_order_number', 'user_info', 'address_info', 'restaurant_info', 'items_details', 'delivery_zone_info'
        ]
    
    def get_user_info(self, obj):
        user = obj.user
        return {
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'username': user.username,
            'telegram_id': user.telegram_id
        }
    
    def get_address_info(self, obj):
        address = obj.address
        return {
            'id': address.id,
            'full_address': address.full_address,
            'city': address.city,
            'latitude': float(address.latitude) if address.latitude else None,
            'longitude': float(address.longitude) if address.longitude else None,
            'phone_number': address.phone_number
        }
    
    def get_restaurant_info(self, obj):
        if obj.restaurant:
            return {
                'id': obj.restaurant.id,
                'name': obj.restaurant.name,
                'city': obj.restaurant.city,
                'address': obj.restaurant.address,
                'phone': obj.restaurant.phone
            }
        return None
    
    def get_items_details(self, obj):
        items = obj.orderitem_set.all()
        return OrderItemDetailSerializer(items, many=True).data
    
    def get_delivery_zone_info(self, obj):
        address = obj.address
        zones = DeliveryZone.objects.filter(
            city__iexact=address.city,
            is_active=True
        )
        
        for zone in zones:
            if zone.is_address_in_zone(address.latitude, address.longitude):
                return {
                    'id': zone.id,
                    'name': zone.name,
                    'city': zone.city,
                    'delivery_fee': float(zone.delivery_fee) if zone.delivery_fee else 0.0,
                    'min_order_amount': float(zone.min_order_amount) if zone.min_order_amount else None
                }
        return None

class OrderAssignmentSerializer(serializers.ModelSerializer):
    """Сериализатор для назначения заказов операторам"""
    order_details = OrderForOperatorSerializer(source='order', read_only=True)
    operator_info = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = OrderAssignment
        fields = [
            'id', 'order', 'order_details', 'operator', 'operator_info',
            'assigned_at', 'accepted_at', 'status', 'status_display',
            'notes', 'rejection_reason'
        ]
    
    def get_operator_info(self, obj):
        operator = obj.operator
        return {
            'id': operator.id,
            'username': operator.username,
            'first_name': operator.first_name,
            'last_name': operator.last_name,
            'phone': operator.phone
        }

class OperatorDashboardSerializer(serializers.Serializer):
    """Сериализатор для дашборда оператора"""
    total_orders = serializers.IntegerField()
    new_orders = serializers.IntegerField()
    processing_orders = serializers.IntegerField()
    confirmed_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
    assigned_zones = serializers.ListField(child=serializers.CharField())
    recent_orders = OrderForOperatorSerializer(many=True)
    notifications = OperatorNotificationSerializer(many=True) 