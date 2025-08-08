from django.urls import path
from .views import (
    AuthView, MenuView, OrderView, UserAddressView, CategoryView, WebhookView,
    AddressView, AddressDetailView, OrderCreateView, GeocodeView, GeocodeResultView,
    DeliveryZoneView, AddressDeliveryZoneCheckView, AddressDeliveryZoneDetailView,
    MenuItemViewSet, AddOnViewSet, SizeOptionViewSet, PromotionViewSet, OrderViewSet,
    TelegramLoginWidgetView, TestUserCreationView, HitsView, NewItemsView, PromotionsView,
    MenuItemDetailView, CategoryItemsView, SearchView, FeaturedView, PriceRangeView,
    StatisticsView, CartView
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'menu-items', MenuItemViewSet)
router.register(r'add-ons', AddOnViewSet)
router.register(r'size-options', SizeOptionViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'orders', OrderViewSet)

urlpatterns = [
    path('webhook/', WebhookView.as_view(), name='webhook'),
    # Аутентификация
    path('auth/', AuthView.as_view(), name='auth'),
    path('auth/telegram-widget/', TelegramLoginWidgetView.as_view(), name='telegram-login-widget'),
    path('auth/test-user/', TestUserCreationView.as_view(), name='test-user-creation'),
    # Адреса (новая модель)
    path('addresses/', AddressView.as_view(), name='addresses'),
    path('addresses/<int:address_id>/', AddressDetailView.as_view(), name='address-detail'),
    # Адреса (старая модель - обратная совместимость)
    path('user-address/', UserAddressView.as_view(), name='user-address'),
    # Меню и категории
    path('categories/', CategoryView.as_view(), name='categories'),
    path('categories/<int:category_id>/items/', CategoryItemsView.as_view(), name='category-items'),
    path('menu/', MenuView.as_view(), name='menu'),
    path('menu/items/<int:item_id>/', MenuItemDetailView.as_view(), name='menu-item-detail'),
    # Хиты, новинки, акции
    path('menu/hits/', HitsView.as_view(), name='hits'),
    path('menu/new/', NewItemsView.as_view(), name='new-items'),
    path('menu/featured/', FeaturedView.as_view(), name='featured'),
    path('menu/search/', SearchView.as_view(), name='search'),
    path('menu/price-range/', PriceRangeView.as_view(), name='price-range'),
    path('promotions/', PromotionsView.as_view(), name='promotions'),
    # Корзина
    path('cart/', CartView.as_view(), name='cart'),
    # Статистика
    path('statistics/', StatisticsView.as_view(), name='statistics'),
    # Заказы
    path('orders/', OrderView.as_view(), name='orders'),
    path('orders/<int:order_id>/', OrderView.as_view(), name='order-detail'),
    path('orders/create/', OrderCreateView.as_view(), name='order-create'),
    path('geocode/', GeocodeView.as_view(), name='geocode'),
    path('geocode-result/<str:task_id>/', GeocodeResultView.as_view(), name='geocode-result'),
    # Зоны доставки
    path('delivery-zones/', DeliveryZoneView.as_view(), name='delivery-zones'),
    path('addresses/delivery-zone-check/', AddressDeliveryZoneCheckView.as_view(), name='address-delivery-zone-check'),
    path('addresses/<int:address_id>/delivery-zone/', AddressDeliveryZoneDetailView.as_view(), name='address-delivery-zone-detail'),
]

urlpatterns += router.urls