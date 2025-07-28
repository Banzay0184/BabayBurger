from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, timedelta
from .models import (
    Operator, OperatorSession, OrderAssignment, 
    OrderStatusHistory, OperatorNotification, OperatorAnalytics
)
from api.models import Order, DeliveryZone, Address, User

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
                    models.Q(username=username) | models.Q(phone=username)
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
            'phone', 'is_active_operator', 'assigned_zones', 'rating',
            'completed_orders_count', 'avg_delivery_time', 'telegram_id',
            'current_session', 'today_stats', 'created_at'
        ]
        read_only_fields = [
            'id', 'rating', 'completed_orders_count', 
            'avg_delivery_time', 'created_at'
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
            'total_price': float(order.total_price),
            'discounted_total': float(order.discounted_total),
            'status': order.status,
            'created_at': order.created_at,
            'delivery_fee': float(order.delivery_fee),
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
                'total': float(item.calculate_total())
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
            'total_earnings', 'rating', 'completion_rate'
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