from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views

# Создаем роутер для API
router = DefaultRouter()

# Регистрируем ViewSets
router.register(r'auth', views.OperatorAuthViewSet, basename='operator-auth')
router.register(r'profile', views.OperatorProfileViewSet, basename='operator-profile')
router.register(r'sessions', views.OperatorSessionViewSet, basename='operator-sessions')
router.register(r'orders', views.OrderViewSet, basename='operator-orders')
router.register(r'notifications', views.OperatorNotificationViewSet, basename='operator-notifications')
router.register(r'analytics', views.OperatorAnalyticsViewSet, basename='operator-analytics')
router.register(r'delivery-zones', views.DeliveryZoneViewSet, basename='operator-delivery-zones')
router.register(r'map', views.OrderMapViewSet, basename='operator-map')

# Дополнительные URL-паттерны
urlpatterns = [
    # Основные маршруты API
    path('api/operator/', include(router.urls)),
    
    # Аутентификация
    path('api/operator/token/', obtain_auth_token, name='api_token_auth'),
    
    # Дополнительные эндпоинты
    path('api/operator/orders/<int:pk>/assign/', 
         views.OrderViewSet.as_view({'post': 'assign'}), 
         name='order-assign'),
    
    path('api/operator/orders/<int:pk>/accept/', 
         views.OrderViewSet.as_view({'post': 'accept'}), 
         name='order-accept'),
    
    path('api/operator/orders/<int:pk>/reject/', 
         views.OrderViewSet.as_view({'post': 'reject'}), 
         name='order-reject'),
    
    path('api/operator/orders/<int:pk>/change-status/', 
         views.OrderViewSet.as_view({'put': 'change_status', 'patch': 'change_status'}), 
         name='order-change-status'),
    
    path('api/operator/orders/<int:pk>/details/', 
         views.OrderViewSet.as_view({'get': 'details'}), 
         name='order-details'),
    
    path('api/operator/sessions/<int:pk>/end/', 
         views.OperatorSessionViewSet.as_view({'post': 'end_session'}), 
         name='session-end'),
    
    path('api/operator/sessions/current/', 
         views.OperatorSessionViewSet.as_view({'get': 'current'}), 
         name='session-current'),
    
    path('api/operator/notifications/mark-read/', 
         views.OperatorNotificationViewSet.as_view({'post': 'mark_read'}), 
         name='notifications-mark-read'),
    
    path('api/operator/notifications/unread-count/', 
         views.OperatorNotificationViewSet.as_view({'get': 'unread_count'}), 
         name='notifications-unread-count'),
    
    path('api/operator/analytics/daily/', 
         views.OperatorAnalyticsViewSet.as_view({'get': 'daily'}), 
         name='analytics-daily'),
    
    path('api/operator/analytics/summary/', 
         views.OperatorAnalyticsViewSet.as_view({'get': 'summary'}), 
         name='analytics-summary'),
    
    path('api/operator/map/<int:pk>/route/', 
         views.OrderMapViewSet.as_view({'get': 'route'}), 
         name='map-route'),
]

# Добавляем маршруты роутера
urlpatterns += router.urls 