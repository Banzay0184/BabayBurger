# Development-specific settings
# This file is imported only in development mode

# Ensure we're in debug mode
DEBUG = True

# Allow all hosts in development
ALLOWED_HOSTS = ['*']

# More permissive CORS for development
CORS_ALLOW_ALL_ORIGINS = True

# Disable CSRF for development (if needed)
# CSRF_COOKIE_SECURE = False
# SESSION_COOKIE_SECURE = False
