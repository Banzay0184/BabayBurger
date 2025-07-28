from django.apps import AppConfig


class AppOperatorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app_operator'
    verbose_name = 'Приложение оператора'

    def ready(self):
        """
        Импортируем сигналы при запуске приложения
        """
        import app_operator.signals
