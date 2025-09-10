from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CashierAuthViewSet, CashierOrderViewSet, CashierStopListViewSet

router = DefaultRouter()
router.register(r'auth', CashierAuthViewSet, basename='cashier-auth')
router.register(r'orders', CashierOrderViewSet, basename='cashier-orders')
router.register(r'stoplist', CashierStopListViewSet, basename='cashier-stoplist')

urlpatterns = [
    path('', include(router.urls)),
]
