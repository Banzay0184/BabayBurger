from django.urls import re_path
from app_operator import consumers

websocket_urlpatterns = [
    re_path(r'ws/operator/$', consumers.OperatorConsumer.as_asgi()),
    re_path(r'ws/operator/(?P<operator_id>\w+)/$', consumers.OperatorConsumer.as_asgi()),
    re_path(r'ws/order/(?P<order_id>\w+)/$', consumers.OrderConsumer.as_asgi()),
    re_path(r'ws/client/(?P<telegram_id>\w+)/$', consumers.ClientConsumer.as_asgi()),
    re_path(r'ws/cashier/$', consumers.CashierConsumer.as_asgi()),
    re_path(r'ws/cashier/(?P<cashier_id>\w+)/$', consumers.CashierConsumer.as_asgi()),
]
