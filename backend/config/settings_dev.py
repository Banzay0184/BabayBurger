# Development-specific settings
# This file is imported only in development mode

# Ensure we're in debug mode
DEBUG = True

# Allow all hosts in development - this will override the base settings
ALLOWED_HOSTS = ['*']

# More permissive CORS for development
CORS_ALLOW_ALL_ORIGINS = True

# Disable CSRF for development (if needed)
# CSRF_COOKIE_SECURE = False
# SESSION_COOKIE_SECURE = False

print("🔧 Development settings loaded - ALLOWED_HOSTS set to ['*']")
