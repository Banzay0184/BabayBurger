from django.urls import path
from .admin_views import (
    AdminAuthView, AdminDashboardView, AdminMenuViewSet, AdminCategoryViewSet,
    AdminOrderViewSet, AdminUserViewSet, AdminPromoCodeViewSet, AdminDeliveryZoneViewSet,
    AdminRestaurantViewSet, AdminCashierViewSet, AdminOperatorViewSet,
    AdminDeliveryDriverViewSet, AdminDeliveryAssignmentsView, AdminAnalyticsView
)
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'menu', AdminMenuViewSet)
router.register(r'categories', AdminCategoryViewSet)
router.register(r'orders', AdminOrderViewSet)
router.register(r'users', AdminUserViewSet)
router.register(r'promo-codes', AdminPromoCodeViewSet)
router.register(r'delivery-zones', AdminDeliveryZoneViewSet)
router.register(r'restaurants', AdminRestaurantViewSet)
router.register(r'cashiers', AdminCashierViewSet)
router.register(r'operators', AdminOperatorViewSet)
router.register(r'delivery-drivers', AdminDeliveryDriverViewSet)

urlpatterns = [
    path('auth/', AdminAuthView.as_view(), name='admin-auth'),
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('delivery-assignments/', AdminDeliveryAssignmentsView.as_view(), name='admin-delivery-assignments'),
] + router.urls
