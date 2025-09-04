from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CashierAuthViewSet, CashierOrderViewSet

router = DefaultRouter()
router.register(r'auth', CashierAuthViewSet, basename='cashier-auth')
router.register(r'orders', CashierOrderViewSet, basename='cashier-orders')

urlpatterns = [
    path('', include(router.urls)),
]
