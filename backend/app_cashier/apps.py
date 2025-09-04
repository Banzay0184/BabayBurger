from django.apps import AppConfig


class AppCashierConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app_cashier'
    
    def ready(self):
        import app_cashier.signals