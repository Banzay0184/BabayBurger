from pathlib import Path
import os
from decouple import config
from dotenv import load_dotenv
import logging.config
import importlib

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY')
# Telegram Bot Settings
BOT_TOKEN = os.getenv('BOT_TOKEN', '')  # Ваш токен бота
WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')  # URL для webhook
TELEGRAM_API_URL = 'https://api.telegram.org'
YANDEX_MAPS_API_KEY = os.getenv('YANDEX_MAPS_API_KEY', '3033f881-c5ec-434f-96aa-e13da893f61f')

# Настройки для валидации initData
TELEGRAM_BOT_USERNAME = os.environ.get('TELEGRAM_BOT_USERNAME', '')  # Имя бота без @

# Настройки для Mini App
MINI_APP_URL = os.environ.get('MINI_APP_URL', '')  # URL вашего Mini App

# Настройки для ngrok
ALLOWED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '158.220.117.109',  # IP адрес сервера
    'ip-api.com',  # Внешний сервис для проверки IP
    'gamvibe.live',  # Внешний сервис
    '3e3f35c1758a.ngrok-free.app',    # Ваш ngrok домен
    '.ngrok-free.app',  # Все ngrok домены
    '.ngrok.io',  # Старые ngrok домены
    '.babayfood.uz',
    'babayfood.uz',
    'api.babayfood.uz',
    'www.babayfood.uz',
]

# В режиме разработки разрешаем все хосты для тестирования
if DEBUG:
    ALLOWED_HOSTS = ['*']

# CSRF настройки для фронтенда и ngrok
CSRF_TRUSTED_ORIGINS = [
    'https://babay-burger.vercel.app',
    'http://localhost:5173',  # Vite dev server
    'http://localhost:3000',  # React dev server
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://158.220.117.109:8000',  # IP адрес сервера
    'https://158.220.117.109:8000',  # IP адрес сервера с HTTPS
    os.getenv('WEBHOOK_URL'),
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
    'https://babayfood.uz',
    'https://api.babayfood.uz',
    'https://www.babayfood.uz',
]

# Trust proxy headers (e.g., Nginx) for correct host and scheme detection
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# CORS настройки для API
CORS_ALLOW_ALL_ORIGINS = False  # Отключаем автоматический CORS для нашего middleware
CORS_ALLOW_CREDENTIALS = False  # Изменяем на False для совместимости

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://158.220.117.109:8000',  # IP адрес сервера
    'https://158.220.117.109:8000',  # IP адрес сервера с HTTPS
    'https://babay-burger.vercel.app',  # Vercel домен
    'https://*.vercel.app',  # Все Vercel домены
    'https://*.ngrok-free.app',  # Ngrok домены
    'https://*.ngrok.io',  # Старые ngrok домены
]

# Дополнительные CORS настройки
CORS_ALLOWED_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'ngrok-skip-browser-warning',  # Для ngrok
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers',
]

CORS_ALLOWED_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Дополнительные настройки для CORS
CORS_EXPOSE_HEADERS = [
    'content-type',
    'content-length',
    'access-control-allow-origin',
    'access-control-allow-methods',
    'access-control-allow-headers',
]

# Настройки для webhook
CSRF_COOKIE_SAMESITE = 'Lax'  # Для работы с фронтендом
SESSION_COOKIE_SAMESITE = 'Lax'  # Для работы с фронтендом

# Определяем окружение
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
DEBUG = ENVIRONMENT == 'development'

# Создаем папку для логов если её нет
LOGS_DIR = BASE_DIR / 'logs'
try:
    LOGS_DIR.mkdir(exist_ok=True)
except Exception as e:
    # Если не удается создать папку, используем временную директорию
    import tempfile
    LOGS_DIR = Path(tempfile.gettempdir()) / 'streetburger_logs'
    LOGS_DIR.mkdir(exist_ok=True)

# Настройки логирования
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            'format': '{message}',
            'style': '{',
        },
        'detailed': {
            'format': '[{asctime}] {levelname} {module} {funcName} {lineno} - {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'django.log',
            'formatter': 'verbose',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'api_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'api.log',
            'formatter': 'json',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': LOGS_DIR / 'errors.log',
            'formatter': 'detailed',
            'maxBytes': 1024 * 1024 * 10,  # 10MB
            'backupCount': 5,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'api': {
            'handlers': ['console', 'api_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api',
    'app_operator',
    'app_cashier',
    'corsheaders',

    'rest_framework',
    'rest_framework.authtoken',
    'channels',
]

MIDDLEWARE = [
    'api.middleware.CORSMiddleware',  # Наш кастомный CORS middleware ПЕРЕД corsheaders
    'corsheaders.middleware.CorsMiddleware',  # Стандартный CORS middleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.RequestLoggingMiddleware',  # Исправляем имя класса
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Настройка кастомной модели пользователя
AUTH_USER_MODEL = 'app_operator.Operator'

# Настройки кэширования
if importlib.util.find_spec("django_redis"):
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                'SOCKET_CONNECT_TIMEOUT': 5,
                'SOCKET_TIMEOUT': 5,
            },
            'KEY_PREFIX': 'streetburger',
            'TIMEOUT': 300,  # 5 минут по умолчанию
        }
    }
    SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
    SESSION_CACHE_ALIAS = 'default'
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
            'TIMEOUT': 300,
        }
    }
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Настройки базы данных
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='babay'),
        'USER': config('DB_USER', default='babay'),
        'PASSWORD': config('DB_PASSWORD', default='16SkcP91'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        'OPTIONS': {
            'connect_timeout': 10,
       }
    }
}

# Альтернативная конфигурация через DATABASE_URL
if os.getenv('DATABASE_URL'):
    import dj_database_url
    DATABASES['default'] = dj_database_url.parse(os.getenv('DATABASE_URL'))

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'ru-ru'

TIME_ZONE = 'Asia/Tashkent'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'

#STATICFILES_DIRS = [
#    BASE_DIR / "static",
#]

# Настройки для медиа файлов (изображения)
MEDIA_URL = "https://api.babayfood.uz/media/"
MEDIA_ROOT = BASE_DIR / "media"


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Настройки REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # По умолчанию разрешаем доступ всем
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

# Настройки Celery
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/0')

# Настройки Celery
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Настройки задач Celery
CELERY_TASK_ROUTES = {
    'api.tasks.send_telegram_notification': {'queue': 'notifications'},
}

# Настройки очередей
CELERY_TASK_DEFAULT_QUEUE = 'default'
CELERY_TASK_QUEUES = {
    'default': {
        'exchange': 'default',
        'routing_key': 'default',
    },
    'notifications': {
        'exchange': 'notifications',
        'routing_key': 'notifications',
    },
}

# Настройки воркера
CELERY_WORKER_CONCURRENCY = 4
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
CELERY_WORKER_PREFETCH_MULTIPLIER = 1

# Настройки таймаутов
CELERY_TASK_SOFT_TIME_LIMIT = 60
CELERY_TASK_TIME_LIMIT = 120

# Настройки логирования для Celery
CELERY_WORKER_HIJACK_ROOT_LOGGER = False
CELERY_WORKER_LOG_FORMAT = '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
CELERY_WORKER_TASK_LOG_FORMAT = '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s'

# Настройки Django Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/2')],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}

try:
    from .settings_dev import *
except ImportError:
    pass
