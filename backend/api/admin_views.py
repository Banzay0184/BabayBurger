from rest_framework import status, generics, viewsets, serializers
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from app_operator.models import Operator
from .admin_auth import AdminTokenAuthentication
from rest_framework.authentication import TokenAuthentication
from django.db.models import Count, Sum, Avg, Q, F
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction
import json

from .models import (
    User, MenuItem, Order, OrderItem, Category, Address, AddOn, SizeOption, 
    Promotion, DeliveryZone, Favorite, Restaurant, PromoCode, PromoCodeUsage,
    DeliveryDriver, DeliveryAssignment
)
from app_cashier.models import Cashier, CashierSession, OrderProcessing, CashierAnalytics
from app_operator.models import Operator, OperatorSession, OrderAssignment, OperatorAnalytics
from .serializers import (
    CategorySerializer, OrderSerializer, UserSerializer,
    AddressSerializer, AddOnSerializer, SizeOptionSerializer, PromotionSerializer,
    DeliveryZoneSerializer, RestaurantSerializer, PromoCodeSerializer
)
from app_cashier.serializers import CashierSerializer, CashierSessionSerializer, OrderProcessingSerializer
from app_operator.serializers import OperatorSerializer, OperatorSessionSerializer, OrderAssignmentSerializer


# Простые сериализаторы для админки
class AdminMenuItemSerializer(serializers.ModelSerializer):
    """Специальный сериализатор для админки с поддержкой FormData"""
    size_options = serializers.SerializerMethodField()
    add_on_options = serializers.SerializerMethodField()
    
    # Поля для записи - используем ListField для поддержки FormData
    size_options_write = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    add_on_options_write = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    def to_internal_value(self, data):
        """Переопределяем для поддержки оригинальных ключей фронтенда и FormData"""
        print("🚨 AdminMenuItemSerializer.to_internal_value() CALLED!")
        import logging
        logger = logging.getLogger('api.admin_views')
        
        logger.info(f"🔍 to_internal_value called with data: {data}")
        logger.info(f"🔍 data type: {type(data)}")
        logger.info(f"🔍 data keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
        data = data.copy()
        
        # Если данные приходят с оригинальными ключами, преобразуем их
        if 'size_options' in data and 'size_options_write' not in data:
            data['size_options_write'] = data.pop('size_options', [])
        if 'add_on_options' in data and 'add_on_options_write' not in data:
            data['add_on_options_write'] = data.pop('add_on_options', [])
        
        # Обрабатываем FormData - преобразуем строки в списки чисел
        if 'size_options_write' in data:
            size_options = data['size_options_write']
            logger.info(f"🔍 size_options_write received: {size_options} (type: {type(size_options)})")
            
            try:
                if isinstance(size_options, str) and size_options.strip():
                    # Если это строка, разделяем по запятой
                    size_list = [int(x.strip()) for x in size_options.split(',') if x.strip()]
                    data['size_options_write'] = size_list
                    logger.info(f"🔍 size_options_write processed from string: {size_list}")
                elif isinstance(size_options, list) and len(size_options) > 0:
                    # Если это список, обрабатываем первый элемент
                    first_item = size_options[0]
                    logger.info(f"🔍 First item in size_options list: {first_item} (type: {type(first_item)})")
                    if isinstance(first_item, str) and first_item.strip():
                        # Разделяем по запятой если это строка с несколькими значениями
                        size_list = [int(x.strip()) for x in first_item.split(',') if x.strip()]
                        data['size_options_write'] = size_listt
                        logger.info(f"🔍 size_options_write processed from FormData list: {size_list}")
                    else:
                        # Если это уже числа
                        data['size_options_write'] = [int(x) for x in size_options if str(x).strip()]
                        logger.info(f"🔍 size_options_write processed from number list: {data['size_options_write']}")
                else:
                    logger.info(f"🔍 size_options_write empty or invalid, setting to empty list")
                    data['size_options_write'] = []
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Error processing size_options_write: {e}")
                data['size_options_write'] = []
        
        if 'add_on_options_write' in data:
            add_on_options = data['add_on_options_write']
            logger.info(f"🔍 add_on_options_write received: {add_on_options} (type: {type(add_on_options)})")
            
            try:
                if isinstance(add_on_options, str) and add_on_options.strip():
                    # Если это строка, разделяем по запятой
                    addon_list = [int(x.strip()) for x in add_on_options.split(',') if x.strip()]
                    data['add_on_options_write'] = addon_list
                    logger.info(f"🔍 add_on_options_write processed from string: {addon_list}")
                elif isinstance(add_on_options, list) and len(add_on_options) > 0:
                    # Если это список, обрабатываем первый элемент
                    first_item = add_on_options[0]
                    logger.info(f"🔍 First item in add_on_options list: {first_item} (type: {type(first_item)})")
                    if isinstance(first_item, str) and first_item.strip():
                        # Разделяем по запятой если это строка с несколькими значениями
                        addon_list = [int(x.strip()) for x in first_item.split(',') if x.strip()]
                        data['add_on_options_write'] = addon_list
                        logger.info(f"🔍 add_on_options_write processed from FormData list: {addon_list}")
                    else:
                        # Если это уже числа
                        data['add_on_options_write'] = [int(x) for x in add_on_options if str(x).strip()]
                        logger.info(f"🔍 add_on_options_write processed from number list: {data['add_on_options_write']}")
                else:
                    logger.info(f"🔍 add_on_options_write empty or invalid, setting to empty list")
                    data['add_on_options_write'] = []
            except (ValueError, TypeError) as e:
                logger.error(f"❌ Error processing add_on_options_write: {e}")
                data['add_on_options_write'] = []
        
        logger.info(f"🔍 Final data before super().to_internal_value(): {data}")
        logger.info(f"🔍 Final size_options_write: {data.get('size_options_write')} (type: {type(data.get('size_options_write'))})")
        logger.info(f"🔍 Final add_on_options_write: {data.get('add_on_options_write')} (type: {type(data.get('add_on_options_write'))})")
        
        result = super().to_internal_value(data)
        logger.info(f"🔍 Result from super().to_internal_value(): {result}")
        return result
    
    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'price', 'category', 'image', 'created_at',
            'is_hit', 'is_new', 'is_active', 'priority', 'size_options', 'add_on_options',
            'size_options_write', 'add_on_options_write'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_size_options(self, obj):
        """Возвращает размеры товара с полной информацией"""
        from .serializers import SizeOptionSerializer
        active_sizes = obj.size_options.filter(is_active=True)
        return SizeOptionSerializer(active_sizes, many=True).data
    
    def get_add_on_options(self, obj):
        """Возвращает добавки товара с полной информацией"""
        from .serializers import AddOnSerializer
        active_addons = obj.add_on_options.filter(is_active=True)
        return AddOnSerializer(active_addons, many=True).data
    
    def create(self, validated_data):
        import logging
        logger = logging.getLogger('api.admin_views')
        
        logger.info(f"🔍 create() called with validated_data: {validated_data}")
        # Извлекаем данные для many-to-many полей (поддерживаем оба варианта ключей)
        size_options_ids = validated_data.pop('size_options_write', []) or validated_data.pop('size_options', [])
        add_on_options_ids = validated_data.pop('add_on_options_write', []) or validated_data.pop('add_on_options', [])
        
        logger.info(f"🔍 create() - size_options_ids: {size_options_ids}")
        logger.info(f"🔍 create() - add_on_options_ids: {add_on_options_ids}")
        
        # Фильтруем пустые значения и конвертируем в числа
        size_options_ids = [int(x) for x in size_options_ids if x is not None and str(x).strip()]
        add_on_options_ids = [int(x) for x in add_on_options_ids if x is not None and str(x).strip()]
        
        logger.info(f"🔍 create() - processed size_options_ids: {size_options_ids}")
        logger.info(f"🔍 create() - processed add_on_options_ids: {add_on_options_ids}")
        
        # Создаем объект
        menu_item = MenuItem.objects.create(**validated_data)
        
        # Устанавливаем связи
        if size_options_ids:
            # Получаем объекты SizeOption по ID
            size_options = SizeOption.objects.filter(id__in=size_options_ids)
            menu_item.size_options.set(size_options)
        if add_on_options_ids:
            # Получаем объекты AddOn по ID
            add_on_options = AddOn.objects.filter(id__in=add_on_options_ids)
            menu_item.add_on_options.set(add_on_options)
        
        return menu_item
    
    def update(self, instance, validated_data):
        import logging
        logger = logging.getLogger('api.admin_views')
        
        logger.info(f"🔍 update() called with validated_data: {validated_data}")
        
        # Проверяем наличие данных для many-to-many полей ПЕРЕД извлечением
        has_size_options = 'size_options_write' in validated_data
        has_add_on_options = 'add_on_options_write' in validated_data
        
        # Извлекаем данные для many-to-many полей (поддерживаем оба варианта ключей)
        size_options_data = validated_data.pop('size_options_write', None)
        if size_options_data is None:
            size_options_data = validated_data.pop('size_options', None)
        
        add_on_options_data = validated_data.pop('add_on_options_write', None)
        if add_on_options_data is None:
            add_on_options_data = validated_data.pop('add_on_options', None)
        
        logger.info(f"🔍 update() - has_size_options: {has_size_options}, size_options_data: {size_options_data}")
        logger.info(f"🔍 update() - has_add_on_options: {has_add_on_options}, add_on_options_data: {add_on_options_data}")
        
        # Обновляем основные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Обновляем связи если они переданы
        if has_size_options:
            logger.info(f"🔍 Updating size_options with data: {size_options_data}")
            # Фильтруем пустые значения и конвертируем в числа
            if size_options_data is not None:
                size_options_ids = [int(x) for x in size_options_data if x is not None and str(x).strip()]
            else:
                size_options_ids = []
            logger.info(f"🔍 Processed size_options_ids: {size_options_ids}")
            size_options = SizeOption.objects.filter(id__in=size_options_ids)
            instance.size_options.set(size_options)
            logger.info(f"✅ Size options updated: {list(size_options.values_list('id', flat=True))}")
        if has_add_on_options:
            logger.info(f"🔍 Updating add_on_options with data: {add_on_options_data}")
            # Фильтруем пустые значения и конвертируем в числа
            if add_on_options_data is not None:
                add_on_options_ids = [int(x) for x in add_on_options_data if x is not None and str(x).strip()]
            else:
                add_on_options_ids = []
            logger.info(f"🔍 Processed add_on_options_ids: {add_on_options_ids}")
            add_on_options = AddOn.objects.filter(id__in=add_on_options_ids)
            instance.add_on_options.set(add_on_options)
            logger.info(f"✅ Add-on options updated: {list(add_on_options.values_list('id', flat=True))}")
        
        return instance
class DeliveryDriverSerializer(serializers.ModelSerializer):
    """Сериализатор для курьеров доставки"""
    user_name = serializers.SerializerMethodField()
    user_phone = serializers.CharField(source='phone', read_only=True)
    restaurants_names = serializers.SerializerMethodField()
    current_assignments = serializers.SerializerMethodField()
    
    class Meta:
        model = DeliveryDriver
        fields = [
            'id', 'user', 'user_name', 'user_phone', 'telegram_id', 'phone', 'status',
            'is_active', 'max_orders', 'current_orders_count', 'rating', 'total_deliveries',
            'restaurants', 'restaurants_names', 'current_assignments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_orders_count', 'total_deliveries']
    
    def get_user_name(self, obj):
        """Получить полное имя пользователя"""
        if obj.user.first_name and obj.user.last_name:
            return f"{obj.user.first_name} {obj.user.last_name}".strip()
        elif obj.user.first_name:
            return obj.user.first_name
        elif obj.user.username:
            return obj.user.username
        return f"Пользователь #{obj.user.id}"
    
    def get_restaurants_names(self, obj):
        """Получить названия ресторанов"""
        return [restaurant.name for restaurant in obj.restaurants.all()]
    
    def get_current_assignments(self, obj):
        """Получить текущие назначения"""
        current_assignments = DeliveryAssignment.objects.filter(
            driver=obj,
            status__in=['assigned', 'accepted', 'picked_up', 'delivering']
        ).select_related('order', 'order__user', 'order__address')
        
        return [
            {
                'id': assignment.id,
                'order_id': assignment.order.id,
                'status': assignment.status,
                'status_display': assignment.get_status_display(),
                'assigned_at': assignment.assigned_at,
                'accepted_at': assignment.accepted_at,
                'picked_up_at': assignment.picked_up_at,
                'delivered_at': assignment.delivered_at,
                'customer_name': assignment.order.user.first_name,
                'customer_phone': assignment.order.phone,
                'address': assignment.order.address.full_address if assignment.order.address else 'Адрес не указан',
                'total_price': float(assignment.order.final_price),
                'payment_method': assignment.order.get_payment_method_display(),
                'receipt_photo': assignment.receipt_photo.url if assignment.receipt_photo else None,
            }
            for assignment in current_assignments
        ]


class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    """Сериализатор для назначений доставки"""
    driver_name = serializers.SerializerMethodField()
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()
    receipt_photo_url = serializers.SerializerMethodField()
    delivery_time = serializers.SerializerMethodField()
    
    class Meta:
        model = DeliveryAssignment
        fields = [
            'id', 'order', 'order_id', 'driver', 'driver_name', 'assigned_at',
            'accepted_at', 'picked_up_at', 'delivered_at', 'status', 'notes',
            'customer_name', 'customer_phone', 'address', 'total_price', 
            'payment_method', 'receipt_photo', 'receipt_photo_url', 'delivery_time'
        ]
        read_only_fields = ['id', 'assigned_at']
    
    def get_driver_name(self, obj):
        """Получить имя курьера"""
        if obj.driver.user.first_name and obj.driver.user.last_name:
            return f"{obj.driver.user.first_name} {obj.driver.user.last_name}".strip()
        elif obj.driver.user.first_name:
            return obj.driver.user.first_name
        return f"Курьер #{obj.driver.id}"
    
    def get_customer_name(self, obj):
        """Получить имя клиента"""
        return obj.order.user.first_name or f"Клиент #{obj.order.user.id}"
    
    def get_customer_phone(self, obj):
        """Получить телефон клиента"""
        return obj.order.phone
    
    def get_address(self, obj):
        """Получить адрес доставки"""
        if obj.order.address:
            return obj.order.address.full_address
        return 'Адрес не указан'
    
    def get_total_price(self, obj):
        """Получить общую стоимость заказа"""
        return float(obj.order.final_price)
    
    def get_payment_method(self, obj):
        """Получить способ оплаты"""
        return obj.order.get_payment_method_display()
    
    def get_receipt_photo_url(self, obj):
        """Получить URL фото чека"""
        if obj.receipt_photo:
            return obj.receipt_photo.url
        return None
    
    def get_delivery_time(self, obj):
        """Получить время доставки"""
        if obj.accepted_at and obj.delivered_at:
            delivery_time = obj.delivered_at - obj.accepted_at
            total_seconds = int(delivery_time.total_seconds())
            minutes = total_seconds // 60
            seconds = total_seconds % 60
            return f"{minutes}м {seconds}с"
        return None


class AdminAuthView(APIView):
    """Аутентификация для админки"""
    permission_classes = []  # Разрешаем доступ без аутентификации
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Необходимо указать username и password'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(username=username, password=password)
        
        if user and user.is_staff:
            # Создаем или получаем токен для пользователя
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'success': True,
                'token': token.key,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                }
            })
        else:
            return Response(
                {'error': 'Неверные учетные данные или недостаточно прав'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    def get(self, request):
        """Проверка валидности токена"""
        auth_header = request.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            return Response(
                {'error': 'Токен не предоставлен'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        token_key = auth_header.split(' ')[1]
        
        try:
            token = Token.objects.get(key=token_key)
            user = token.user
            
            if not user.is_staff:
                return Response(
                    {'error': 'Недостаточно прав'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            return Response({
                'success': True,
                'valid': True,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                }
            })
        except Token.DoesNotExist:
            return Response(
                {'error': 'Недействительный токен'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )


class AdminDashboardView(generics.GenericAPIView):
    """Главная панель админки с общей статистикой"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)
        
        # Общая статистика
        stats = {
            'users': {
                'total': Operator.objects.count(),
                'new_today': Operator.objects.filter(date_joined__date=today).count(),
                'new_week': Operator.objects.filter(date_joined__date__gte=week_ago).count(),
                'new_month': Operator.objects.filter(date_joined__date__gte=month_ago).count(),
            },
            'orders': {
                'total': Order.objects.count(),
                'today': Order.objects.filter(created_at__date=today).count(),
                'week': Order.objects.filter(created_at__date__gte=week_ago).count(),
                'month': Order.objects.filter(created_at__date__gte=month_ago).count(),
                'pending': Order.objects.filter(status='pending').count(),
                'preparing': Order.objects.filter(status='preparing').count(),
                'completed': Order.objects.filter(status='completed').count(),
                'cancelled': Order.objects.filter(status='cancelled').count(),
            },
            'revenue': {
                'today': Order.objects.filter(
                    created_at__date=today, 
                    status='completed'
                ).aggregate(total=Sum('final_price'))['total'] or 0,
                'week': Order.objects.filter(
                    created_at__date__gte=week_ago, 
                    status='completed'
                ).aggregate(total=Sum('final_price'))['total'] or 0,
                'month': Order.objects.filter(
                    created_at__date__gte=month_ago, 
                    status='completed'
                ).aggregate(total=Sum('final_price'))['total'] or 0,
            },
            'menu': {
                'categories': Category.objects.count(),
                'items': MenuItem.objects.count(),
                'active_items': MenuItem.objects.filter(is_active=True).count(),
                'hits': MenuItem.objects.filter(is_hit=True).count(),
                'new_items': MenuItem.objects.filter(is_new=True).count(),
            },
            'delivery': {
                'zones': DeliveryZone.objects.filter(is_active=True).count(),
                'drivers': DeliveryDriver.objects.filter(is_active=True).count(),
                'active_drivers': DeliveryDriver.objects.filter(
                    is_active=True, 
                    status='active'
                ).count(),
            },
            'staff': {
                'cashiers': Cashier.objects.filter(is_active_cashier=True).count(),
                'operators': Operator.objects.filter(is_active_operator=True).count(),
            }
        }
        
        # Топ товары за месяц
        top_items = MenuItem.objects.filter(
            orderitem__order__created_at__date__gte=month_ago,
            orderitem__order__status='completed'
        ).annotate(
            total_orders=Count('orderitem__order'),
            total_quantity=Sum('orderitem__quantity')
        ).order_by('-total_quantity')[:10]
        
        # Статистика по дням за последнюю неделю
        daily_stats = []
        for i in range(7):
            date = today - timedelta(days=i)
            day_orders = Order.objects.filter(created_at__date=date)
            day_revenue = day_orders.filter(status='completed').aggregate(
                total=Sum('final_price')
            )['total'] or 0
            
            daily_stats.append({
                'date': date.strftime('%Y-%m-%d'),
                'orders': day_orders.count(),
                'revenue': float(day_revenue),
            })
        
        return Response({
            'stats': stats,
            'top_items': AdminMenuItemSerializer(top_items, many=True).data,
            'daily_stats': list(reversed(daily_stats)),
        })


class AdminMenuViewSet(viewsets.ModelViewSet):
    """Управление меню"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = MenuItem.objects.all()
    serializer_class = AdminMenuItemSerializer
    
    def create(self, request, *args, **kwargs):
        print("🚨 AdminMenuViewSet.create() CALLED!")
        import logging
        logger = logging.getLogger('api.admin_views')
        
        logger.info(f"🔍 AdminMenuViewSet.create() called")
        logger.info(f"🔍 request.data: {request.data}")
        logger.info(f"🔍 request.FILES: {request.FILES}")
        logger.info(f"🔍 request.content_type: {request.content_type}")
        
        # Проверяем конкретные поля
        if 'size_options_write' in request.data:
            logger.info(f"🔍 size_options_write in request.data: {request.data['size_options_write']} (type: {type(request.data['size_options_write'])})")
        if 'add_on_options_write' in request.data:
            logger.info(f"🔍 add_on_options_write in request.data: {request.data['add_on_options_write']} (type: {type(request.data['add_on_options_write'])})")
        
        try:
            result = super().create(request, *args, **kwargs)
            logger.info(f"✅ AdminMenuViewSet.create() success: {result.data}")
            return result
        except Exception as e:
            logger.error(f"❌ AdminMenuViewSet.create() error: {e}")
            logger.error(f"❌ Error type: {type(e)}")
            logger.error(f"❌ Error args: {e.args}")
            raise
    
    def get_queryset(self):
        queryset = MenuItem.objects.select_related('category').prefetch_related(
            'size_options', 'add_on_options'
        )
        
        # Фильтрация
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        is_hit = self.request.query_params.get('is_hit')
        if is_hit is not None:
            queryset = queryset.filter(is_hit=is_hit.lower() == 'true')
        
        is_new = self.request.query_params.get('is_new')
        if is_new is not None:
            queryset = queryset.filter(is_new=is_new.lower() == 'true')
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        
        return queryset.order_by('priority', '-created_at')
    
    def list(self, request, *args, **kwargs):
        """Переопределяем list для кастомной пагинации"""
        queryset = self.get_queryset()
        
        # Получаем параметры пагинации
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        # Вычисляем offset
        offset = (page - 1) * page_size
        
        # Получаем общее количество
        total_count = queryset.count()
        
        # Получаем данные для текущей страницы
        items = queryset[offset:offset + page_size]
        
        # Сериализуем данные
        serializer = self.get_serializer(items, many=True)
        
        # Вычисляем информацию о пагинации
        total_pages = (total_count + page_size - 1) // page_size
        has_next = page < total_pages
        has_previous = page > 1
        
        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'has_next': has_next,
            'has_previous': has_previous,
            'results': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def toggle_hit(self, request, pk=None):
        """Переключить статус 'Хит'"""
        item = self.get_object()
        item.is_hit = not item.is_hit
        item.save()
        return Response({'is_hit': item.is_hit})
    
    @action(detail=True, methods=['post'])
    def toggle_new(self, request, pk=None):
        """Переключить статус 'Новинка'"""
        item = self.get_object()
        item.is_new = not item.is_new
        item.save()
        return Response({'is_new': item.is_new})
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Переключить статус 'Активно'"""
        item = self.get_object()
        item.is_active = not item.is_active
        item.save()
        return Response({'is_active': item.is_active})


class AdminCategoryViewSet(viewsets.ModelViewSet):
    """Управление категориями"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    
    def get_queryset(self):
        queryset = Category.objects.annotate(
            items_count=Count('menuitem')
        ).order_by('name')
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset


class AdminOrderViewSet(viewsets.ModelViewSet):
    """Управление заказами"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    
    def get_queryset(self):
        queryset = Order.objects.select_related(
            'user', 'address', 'restaurant', 'promotion', 'promo_code'
        ).prefetch_related('orderitem_set__menu_item', 'orderitem_set__size_option')
        
        # Фильтрация
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        service_type = self.request.query_params.get('service_type')
        if service_type:
            queryset = queryset.filter(service_type=service_type)
        
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search) |
                Q(user__username__icontains=search) |
                Q(address__street__icontains=search) |
                Q(phone__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Изменить статус заказа"""
        order = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Order.STATUS_CHOICES):
            return Response(
                {'error': 'Неверный статус'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = new_status
        order.save()
        
        return Response({'status': order.status})
    
    @action(detail=True, methods=['post'])
    def assign_operator(self, request, pk=None):
        """Назначить оператора заказу"""
        order = self.get_object()
        operator_id = request.data.get('operator_id')
        
        try:
            operator = Operator.objects.get(id=operator_id)
            order.assigned_operator = operator
            order.assigned_at = timezone.now()
            order.save()
            
            return Response({'success': True})
        except Operator.DoesNotExist:
            return Response(
                {'error': 'Оператор не найден'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    """Просмотр пользователей"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Operator.objects.all()
    serializer_class = UserSerializer
    
    def get_queryset(self):
        queryset = Operator.objects.annotate(
            orders_count=Count('order'),
            total_spent=Sum('order__final_price')
        ).order_by('-date_joined')
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(username__icontains=search) |
                Q(telegram_id__icontains=search)
            )
        
        return queryset


class AdminPromoCodeViewSet(viewsets.ModelViewSet):
    """Управление промокодами"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = PromoCode.objects.all()
    serializer_class = PromoCodeSerializer
    
    def get_queryset(self):
        queryset = PromoCode.objects.annotate(
            usage_count=Count('promocodeusage')
        ).order_by('-created_at')
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(code__icontains=search)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Переключить активность промокода"""
        promo = self.get_object()
        promo.is_active = not promo.is_active
        promo.save()
        return Response({'is_active': promo.is_active})


class AdminDeliveryZoneViewSet(viewsets.ModelViewSet):
    """Управление зонами доставки"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = DeliveryZone.objects.all()
    serializer_class = DeliveryZoneSerializer
    
    def get_queryset(self):
        queryset = DeliveryZone.objects.order_by('city', 'name')
        
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset


class AdminRestaurantViewSet(viewsets.ModelViewSet):
    """Управление ресторанами"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Restaurant.objects.all()
    serializer_class = RestaurantSerializer
    
    def get_queryset(self):
        queryset = Restaurant.objects.order_by('city', 'name')
        
        city = self.request.query_params.get('city')
        if city:
            queryset = queryset.filter(city__icontains=city)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset


class AdminCashierViewSet(viewsets.ModelViewSet):
    """Управление кассирами"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Cashier.objects.all()
    serializer_class = CashierSerializer
    
    def get_queryset(self):
        queryset = Cashier.objects.select_related('restaurant').order_by('-created_at')
        
        restaurant = self.request.query_params.get('restaurant')
        if restaurant:
            queryset = queryset.filter(restaurant_id=restaurant)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active_cashier=is_active.lower() == 'true')
        
        return queryset


class AdminOperatorViewSet(viewsets.ModelViewSet):
    """Управление операторами"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = Operator.objects.all()
    serializer_class = OperatorSerializer
    
    def get_queryset(self):
        queryset = Operator.objects.prefetch_related('assigned_zones').order_by('-created_at')
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active_operator=is_active.lower() == 'true')
        
        return queryset


class AdminDeliveryDriverViewSet(viewsets.ModelViewSet):
    """Управление курьерами"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = DeliveryDriver.objects.all()
    serializer_class = DeliveryDriverSerializer
    
    def get_queryset(self):
        queryset = DeliveryDriver.objects.select_related('user').prefetch_related('restaurants')
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        return queryset.order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def assignments(self, request, pk=None):
        """Получить назначения курьера"""
        driver = self.get_object()
        assignments = DeliveryAssignment.objects.filter(
            driver=driver
        ).select_related('order', 'order__user', 'order__address').order_by('-assigned_at')
        
        # Фильтрация по статусу
        status_filter = request.query_params.get('status')
        if status_filter:
            assignments = assignments.filter(status=status_filter)
        
        # Фильтрация по дате
        date_from = request.query_params.get('date_from')
        if date_from:
            assignments = assignments.filter(assigned_at__date__gte=date_from)
        
        date_to = request.query_params.get('date_to')
        if date_to:
            assignments = assignments.filter(assigned_at__date__lte=date_to)
        
        serializer = DeliveryAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Получить статистику курьера"""
        driver = self.get_object()
        
        # Период для статистики
        period = request.query_params.get('period', 'week')
        if period == 'day':
            start_date = timezone.now().date()
            end_date = start_date
        elif period == 'week':
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
        else:
            start_date = timezone.now().date() - timedelta(days=7)
            end_date = timezone.now().date()
        
        assignments = DeliveryAssignment.objects.filter(
            driver=driver,
            assigned_at__date__range=[start_date, end_date]
        )
        
        stats = {
            'total_assignments': assignments.count(),
            'completed': assignments.filter(status='delivered').count(),
            'cancelled': assignments.filter(status='cancelled').count(),
            'in_progress': assignments.filter(
                status__in=['assigned', 'accepted', 'picked_up', 'delivering']
            ).count(),
            'avg_delivery_time': None,
            'total_revenue': 0,
            'rating': float(driver.rating),
            'period': period,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
        }
        
        # Среднее время доставки
        completed_assignments = assignments.filter(
            status='delivered',
            delivered_at__isnull=False,
            accepted_at__isnull=False
        )
        
        if completed_assignments.exists():
            total_time = 0
            count = 0
            for assignment in completed_assignments:
                if assignment.accepted_at and assignment.delivered_at:
                    delivery_time = assignment.delivered_at - assignment.accepted_at
                    total_time += delivery_time.total_seconds()
                    count += 1
            
            if count > 0:
                avg_seconds = total_time / count
                stats['avg_delivery_time'] = {
                    'minutes': int(avg_seconds // 60),
                    'seconds': int(avg_seconds % 60)
                }
        
        # Общая выручка
        completed_orders = assignments.filter(status='delivered').values_list('order__final_price', flat=True)
        stats['total_revenue'] = sum(completed_orders) if completed_orders else 0
        
        return Response(stats)


class AdminDeliveryAssignmentsView(generics.GenericAPIView):
    """Управление назначениями доставки"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        """Получить все назначения доставки"""
        assignments = DeliveryAssignment.objects.select_related(
            'order', 'order__user', 'order__address', 'driver', 'driver__user'
        ).order_by('-assigned_at')
        
        # Фильтрация по статусу
        status_filter = request.query_params.get('status')
        if status_filter:
            assignments = assignments.filter(status=status_filter)
        
        # Фильтрация по курьеру
        driver_id = request.query_params.get('driver_id')
        if driver_id:
            assignments = assignments.filter(driver_id=driver_id)
        
        # Фильтрация по дате
        date_from = request.query_params.get('date_from')
        if date_from:
            assignments = assignments.filter(assigned_at__date__gte=date_from)
        
        date_to = request.query_params.get('date_to')
        if date_to:
            assignments = assignments.filter(assigned_at__date__lte=date_to)
        
        # Пагинация
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        
        total_count = assignments.count()
        offset = (page - 1) * page_size
        assignments_page = assignments[offset:offset + page_size]
        
        serializer = DeliveryAssignmentSerializer(assignments_page, many=True)
        
        total_pages = (total_count + page_size - 1) // page_size
        
        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'has_next': page < total_pages,
            'has_previous': page > 1,
            'results': serializer.data
        })


class AdminAnalyticsView(generics.GenericAPIView):
    """Аналитика для админки"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        period = request.query_params.get('period', 'week')  # day, week, month, year
        
        if period == 'day':
            start_date = timezone.now().date()
            end_date = start_date
        elif period == 'week':
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=7)
        elif period == 'month':
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
        elif period == 'year':
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=365)
        else:
            return Response(
                {'error': 'Неверный период'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Статистика заказов
        orders = Order.objects.filter(
            created_at__date__range=[start_date, end_date]
        )
        
        orders_by_status = orders.values('status').annotate(
            count=Count('id')
        ).order_by('status')
        
        # Статистика по дням
        daily_orders = []
        daily_revenue = []
        
        current_date = start_date
        while current_date <= end_date:
            day_orders = orders.filter(created_at__date=current_date)
            day_revenue = day_orders.filter(status='completed').aggregate(
                total=Sum('final_price')
            )['total'] or 0
            
            daily_orders.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'orders': day_orders.count(),
                'revenue': float(day_revenue),
            })
            
            current_date += timedelta(days=1)
        
        # Топ категории
        top_categories = Category.objects.filter(
            menuitem__orderitem__order__created_at__date__range=[start_date, end_date],
            menuitem__orderitem__order__status='completed'
        ).annotate(
            orders_count=Count('menuitem__orderitem__order', distinct=True),
            revenue=Sum('menuitem__orderitem__order__final_price')
        ).order_by('-revenue')[:10]
        
        # Топ товары
        top_items = MenuItem.objects.filter(
            orderitem__order__created_at__date__range=[start_date, end_date],
            orderitem__order__status='completed'
        ).annotate(
            orders_count=Count('orderitem__order', distinct=True),
            quantity_sold=Sum('orderitem__quantity'),
            revenue=Sum('orderitem__order__final_price')
        ).order_by('-quantity_sold')[:10]
        
        return Response({
            'period': period,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': end_date.strftime('%Y-%m-%d'),
            'orders_by_status': list(orders_by_status),
            'daily_stats': daily_orders,
            'top_categories': CategorySerializer(top_categories, many=True).data,
            'top_items': AdminMenuItemSerializer(top_items, many=True).data,
        })
