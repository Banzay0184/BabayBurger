from rest_framework import status, generics, viewsets, serializers
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from app_operator.models import Operator
from .admin_auth import AdminTokenAuthentication
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
    MenuItemSerializer, CategorySerializer, OrderSerializer, UserSerializer,
    AddressSerializer, AddOnSerializer, SizeOptionSerializer, PromotionSerializer,
    DeliveryZoneSerializer, RestaurantSerializer, PromoCodeSerializer
)
from app_cashier.serializers import CashierSerializer, CashierSessionSerializer, OrderProcessingSerializer
from app_operator.serializers import OperatorSerializer, OperatorSessionSerializer, OrderAssignmentSerializer


# Простые сериализаторы для админки
class DeliveryDriverSerializer(serializers.ModelSerializer):
    """Сериализатор для курьеров доставки"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_phone = serializers.CharField(source='user.phone', read_only=True)
    
    class Meta:
        model = DeliveryDriver
        fields = [
            'id', 'user', 'user_name', 'user_phone', 'telegram_id', 'status',
            'is_active', 'vehicle_type', 'license_plate', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DeliveryAssignmentSerializer(serializers.ModelSerializer):
    """Сериализатор для назначений доставки"""
    driver_name = serializers.CharField(source='driver.user.get_full_name', read_only=True)
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    
    class Meta:
        model = DeliveryAssignment
        fields = [
            'id', 'order', 'order_id', 'driver', 'driver_name', 'assigned_at',
            'accepted_at', 'picked_up_at', 'delivered_at', 'status', 'notes'
        ]
        read_only_fields = ['id', 'assigned_at']


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
            'top_items': MenuItemSerializer(top_items, many=True).data,
            'daily_stats': list(reversed(daily_stats)),
        })


class AdminMenuViewSet(viewsets.ModelViewSet):
    """Управление меню"""
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    
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
            'top_items': MenuItemSerializer(top_items, many=True).data,
        })
