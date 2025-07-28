import os
from celery import Celery
from django.conf import settings

# Устанавливаем переменную окружения для настроек Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Создаем экземпляр Celery
app = Celery('streetburger')

# Загружаем настройки из Django settings
app.config_from_object('django.conf:settings', namespace='CELERY')

# Автоматически обнаруживаем задачи в приложениях Django
app.autodiscover_tasks(lambda: settings.INSTALLED_APPS)

# Настройки для задач
app.conf.update(
    # Настройки очередей
    task_default_queue='default',
    task_queues={
        'default': {
            'exchange': 'default',
            'routing_key': 'default',
        },
        'notifications': {
            'exchange': 'notifications',
            'routing_key': 'notifications',
        },
    },
    
    # Настройки маршрутизации
    task_routes={
        'api.tasks.send_telegram_notification': {'queue': 'notifications'},
    },
    
    # Настройки воркера
    worker_concurrency=4,
    worker_max_tasks_per_child=1000,
    worker_prefetch_multiplier=1,
    
    # Настройки таймаутов
    task_soft_time_limit=30,
    task_time_limit=60,
    
    # Настройки логирования
    worker_hijack_root_logger=False,
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
)

@app.task(bind=True)
def debug_task(self):
    """Тестовая задача для проверки работы Celery"""
    print(f'Request: {self.request!r}')
    return 'Celery is working!' 