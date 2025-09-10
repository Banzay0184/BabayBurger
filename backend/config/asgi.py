import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Инициализируем Django ASGI приложение
django_asgi_app = get_asgi_application()

# Импортируем роутинг после инициализации Django
from config.routing import websocket_urlpatterns

# Создаем валидатор с правильными настройками для WebSocket
websocket_origin_validator = AllowedHostsOriginValidator(
    AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    )
)

# Добавляем дополнительные разрешенные хосты для WebSocket
websocket_origin_validator.allowed_hosts = [
    'localhost',
    '127.0.0.1',
    'babay-burger.vercel.app',
    '*.vercel.app',
    '*.ngrok-free.app',
    '*.ngrok.io',
    'babayfood.uz',
    'api.babayfood.uz',
    'www.babayfood.uz',
    'babay-burger.vercel.app',  # Дублируем для надежности
]

# Также добавляем поддержку всех поддоменов Vercel
websocket_origin_validator.allowed_hosts.extend([
    '*.vercel.app',
    '*.ngrok-free.app',
    '*.ngrok.io',
])

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})