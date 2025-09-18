from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import Cashier, CashierSession, OrderProcessing, CashierNotification, CashierAnalytics, CashierToken
from api.models import Order, OrderItem
from api.serializers import OrderItemSerializer


class OrderItemForCashierSerializer(serializers.ModelSerializer):
    """Сериализатор для товаров заказа, оптимизированный для кассирского интерфейса"""
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
        """Получить названия дополнений"""
        return [addon.name for addon in obj.add_ons.all()]
    
    def get_total_price(self, obj):
        """Рассчитать общую стоимость товара"""
        return obj.calculate_total()


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
            # Используем прямую проверку кассира вместо стандартной authenticate()
            try:
                cashier = Cashier.objects.get(username=username)
                if cashier.check_password(password):
                    if cashier.is_active and cashier.is_active_cashier:
                        attrs['cashier'] = cashier
                        return attrs
                    else:
                        raise serializers.ValidationError('Кассир неактивен')
                else:
                    raise serializers.ValidationError('Неверные учетные данные')
            except Cashier.DoesNotExist:
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
            # Используем прямую проверку кассира вместо стандартной authenticate()
            try:
                cashier = Cashier.objects.get(username=username)
                if cashier.check_password(password):
                    if cashier.is_active and cashier.is_active_cashier:
                        attrs['cashier'] = cashier
                        return attrs
                    else:
                        raise serializers.ValidationError('Кассир неактивен')
                else:
                    raise serializers.ValidationError('Неверные учетные данные')
            except Cashier.DoesNotExist:
                raise serializers.ValidationError('Неверные учетные данные')
        else:
            raise serializers.ValidationError('Необходимо указать username и password')


class OrderForCashierSerializer(serializers.ModelSerializer):
    """Сериализатор для заказа, оптимизированный для кассиров"""
    user_info = serializers.SerializerMethodField()
    address_info = serializers.SerializerMethodField()
    restaurant_info = serializers.SerializerMethodField()
    items_details = OrderItemForCashierSerializer(source='orderitem_set', many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    promo_code_info = serializers.SerializerMethodField()
    cashier_processing_status = serializers.SerializerMethodField()
    cashier_processing_details = serializers.SerializerMethodField()
    delivery_fee = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    receipt_photos = serializers.SerializerMethodField()
    
    class Meta:
        model = Order
        fields = [
            'id', 'user_info', 'restaurant_info', 'items_details', 'total_price', 
            'final_price', 'delivery_fee', 'discount_amount', 'status', 'status_display',
            'service_type', 'payment_method', 'address_info', 'phone', 'notes', 
            'promo_code_info', 'created_at', 'updated_at', 'cashier_processing_status',
            'cashier_processing_details', 'operator_order_number', 'receipt_photos'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_user_info(self, obj):
        """Получить информацию о пользователе"""
        if obj.user:
            return {
                'id': obj.user.id,
                'first_name': obj.user.first_name or '',
                'last_name': obj.user.last_name or '',
                'username': obj.user.username or '',
                'telegram_id': obj.user.telegram_id or 0
            }
        return None
    
    def get_address_info(self, obj):
        """Получить информацию об адресе"""
        if obj.address:
            from decimal import Decimal
            
            latitude = obj.address.latitude
            longitude = obj.address.longitude
            
            # Конвертируем Decimal в float для JSON
            if isinstance(latitude, Decimal):
                latitude = float(latitude)
            if isinstance(longitude, Decimal):
                longitude = float(longitude)
            
            return {
                'id': obj.address.id,
                'full_address': obj.address.full_address or '',
                'city': obj.address.city or '',
                'phone_number': obj.address.phone_number or '',
                'latitude': latitude,
                'longitude': longitude
            }
        return None
    
    def get_restaurant_info(self, obj):
        """Получить информацию о ресторане"""
        if obj.restaurant:
            return {
                'id': obj.restaurant.id,
                'name': obj.restaurant.name or '',
                'address': obj.restaurant.address or '',
                'city': obj.restaurant.city or '',
                'phone': obj.restaurant.phone or ''
            }
        return None
    
    def get_promo_code_info(self, obj):
        """Получить информацию о промокоде"""
        if obj.promo_code:
            return {
                'code': obj.promo_code.code,
                'discount_percent': obj.promo_code.discount_percent,
                'max_discount': obj.promo_code.max_discount
            }
        return None
    
    def get_cashier_processing_status(self, obj):
        """Получить статус обработки заказа кассиром"""
        try:
            processing = obj.cashier_processing
            return processing.get_status_display()
        except OrderProcessing.DoesNotExist:
            return None
    
    def get_cashier_processing_details(self, obj):
        """Получить детальную информацию о статусе обработки заказа кассиром"""
        try:
            processing = obj.cashier_processing
            return {
                'status': processing.status,
                'status_display': processing.get_status_display(),
                'received_at': processing.received_at,
                'started_preparing_at': processing.started_preparing_at,
                'ready_at': processing.ready_at,
                'completed_at': processing.completed_at,
                'notes': processing.notes,
                'estimated_time': processing.estimated_time,
                'cashier_name': processing.cashier.get_full_name() if processing.cashier else None
            }
        except OrderProcessing.DoesNotExist:
            return None
    
    def get_delivery_fee(self, obj):
        """Получить стоимость доставки с безопасным значением по умолчанию"""
        return float(obj.delivery_fee) if obj.delivery_fee is not None else 0.0
    
    def get_discount_amount(self, obj):
        """Получить сумму скидки с безопасным значением по умолчанию"""
        return float(obj.discount_amount) if obj.discount_amount is not None else 0.0
    
    def get_final_price(self, obj):
        """Получить итоговую стоимость с безопасным значением по умолчанию"""
        return float(obj.final_price) if obj.final_price is not None else float(obj.total_price)
    
    def get_receipt_photos(self, obj):
        """Получить фотографии чека из назначений доставки"""
        try:
            from api.models import DeliveryAssignment
            from django.conf import settings
            
            # Получаем назначения доставки для этого заказа
            assignments = DeliveryAssignment.objects.filter(
                order=obj,
                receipt_photo__isnull=False
            ).exclude(receipt_photo='')
            
            photos = []
            for assignment in assignments:
                if assignment.receipt_photo:
                    # Формируем полный URL для фотографии
                    photo_url = f"{settings.MEDIA_URL}{assignment.receipt_photo}"
                    photos.append({
                        'id': assignment.id,
                        'photo_url': photo_url,
                        'delivered_at': assignment.delivered_at,
                        'driver_name': f"{assignment.driver.user.first_name} {assignment.driver.user.last_name}".strip() if assignment.driver.user.first_name else f"Курьер #{assignment.driver.id}"
                    })
            
            return photos
        except Exception as e:
            # В случае ошибки возвращаем пустой список
            return []


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