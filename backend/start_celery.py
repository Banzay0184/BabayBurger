#!/usr/bin/env python
"""
Скрипт для запуска Celery worker
"""
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from celery import Celery
from config.celery import app

if __name__ == '__main__':
    # Запускаем Celery worker
    app.worker_main([
        'worker',
        '--loglevel=info',
        '--concurrency=4',
        '--queues=default,notifications',
        '--hostname=streetburger@%h'
    ]) 