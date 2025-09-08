from .settings import *

# Ensure production-safe defaults
DEBUG = False

# Expand allowed hosts for production domain(s)
ALLOWED_HOSTS = list(set((ALLOWED_HOSTS or []) + [
    'api.babayfood.uz',
    'www.babayfood.uz',
    'babayfood.uz',
    '.babayfood.uz',
]))

# Ensure CSRF trusted origins include production domains
CSRF_TRUSTED_ORIGINS = list(set((CSRF_TRUSTED_ORIGINS or []) + [
    'https://api.babayfood.uz',
    'https://www.babayfood.uz',
    'https://babayfood.uz',
]))

# If behind a proxy/Load Balancer (e.g., Nginx), trust forwarded host headers
USE_X_FORWARDED_HOST = True


