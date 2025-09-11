from .settings import *

# Ensure production-safe defaults
# DEBUG is already set in base settings, don't override it here

# Expand allowed hosts for production domain(s)
# Only modify ALLOWED_HOSTS if not in debug mode
if not DEBUG:
    ALLOWED_HOSTS = list(set((ALLOWED_HOSTS or []) + [
        'api.babayfood.uz',
        'www.babayfood.uz',
        'babayfood.uz',
        '.babayfood.uz',
        '158.220.117.109',  # IP адрес сервера
    ]))

# Ensure CSRF trusted origins include production domains
# Only modify CSRF_TRUSTED_ORIGINS if not in debug mode
if not DEBUG:
    CSRF_TRUSTED_ORIGINS = list(set((CSRF_TRUSTED_ORIGINS or []) + [
        'https://api.babayfood.uz',
        'https://www.babayfood.uz',
        'https://babayfood.uz',
        'http://158.220.117.109:8000',  # IP адрес сервера
        'https://158.220.117.109:8000',  # IP адрес сервера с HTTPS
    ]))

# If behind a proxy/Load Balancer (e.g., Nginx), trust forwarded host headers
USE_X_FORWARDED_HOST = True


# settings_prod.py
MEDIA_URL = "https://api.babayfood.uz/media/"
MEDIA_ROOT = BASE_DIR / "media"


STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'
