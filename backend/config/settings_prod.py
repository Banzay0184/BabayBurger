from .settings import *

DEBUG = True

ALLOWED_HOSTS = ['*']

CORS_ALLOW_ALL_ORIGINS = True

CORS_ALLOW_CREDENTIALS = True

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'babay',
        'USER': 'babay',
        'PASSWORD': '16SkcP91',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
