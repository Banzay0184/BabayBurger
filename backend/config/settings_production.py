"""
Настройки Django для продакшена
"""

from .settings import *

# Продакшен настройки
DEBUG = False
ENVIRONMENT = 'production'

# Безопасность для продакшена
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'

# CORS настройки для продакшена
CORS_ALLOW_ALL_ORIGINS = False  # Отключаем для безопасности
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'https://babay-burger.vercel.app',
    'https://*.vercel.app',
    'https://ec5b3f679bd2.ngrok-free.app',
    'https://*.ngrok-free.app',
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
]

CORS_ALLOWED_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# CSRF настройки для продакшена
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'

# Разрешенные хосты для продакшена
ALLOWED_HOSTS = [
    'ec5b3f679bd2.ngrok-free.app',
    'babay-burger.vercel.app',
    '*.vercel.app',
    '*.ngrok-free.app',
]

# CSRF доверенные источники
CSRF_TRUSTED_ORIGINS = [
    'https://babay-burger.vercel.app',
    'https://*.vercel.app',
    'https://ec5b3f679bd2.ngrok-free.app',
    'https://*.ngrok-free.app',
]

# Логирование для продакшена
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'verbose',
            'maxBytes': 1024 * 1024 * 10,
            'backupCount': 5,
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'errors.log',
            'formatter': 'verbose',
            'maxBytes': 1024 * 1024 * 10,
            'backupCount': 5,
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'api': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
} 