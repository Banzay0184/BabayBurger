import os
import requests
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from django.db.models import Avg, Count, Sum, Q
from datetime import datetime, timedelta
import re

def validate_uzbek_phone_number(value):
    """
    Валидатор для узбекских номеров телефонов
    """
    # Если значение пустое, пропускаем валидацию (для суперпользователей)
    if not value:
        return
    
    cleaned = re.sub(r'[\s\-\(\)]', '', str(value))
    
    if not cleaned.isdigit() and not cleaned.startswith('+998'):
        raise ValidationError(
            'Введите корректный узбекский номер телефона. '
            'Примеры: +998 90 123 45 67, +998901234567, 901234567'
        )
    
    if cleaned.startswith('+998'):
        cleaned = cleaned[4:]
    elif cleaned.startswith('998'):
        cleaned = cleaned[3:]
    
    if len(cleaned) != 9:
        raise ValidationError(
            'Номер должен содержать 9 цифр после кода страны. '
            'Примеры: +998 90 123 45 67, 901234567'
        )
    
    operator_code = cleaned[:2]
    valid_operators = ['90', '91', '93', '94', '95', '97', '98', '99', '88', '77']
    
    if operator_code not in valid_operators:
        raise ValidationError(
            f'Неверный код оператора: {operator_code}. '
            f'Допустимые коды: {", ".join(valid_operators)}'
        )
    
    remaining_digits = cleaned[2:]
    if len(set(remaining_digits)) == 1:
        raise ValidationError(
            'Номер не может состоять из повторяющихся цифр'
        )

class Operator(AbstractUser):
    """
    Модель оператора доставки
    Расширяет стандартную модель User Django
    """
    # Основные поля
    phone = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        null=True,
        verbose_name="Номер телефона",
        validators=[validate_uzbek_phone_number],
        help_text="Формат: +998 90 123 45 67 или 901234567"
    )
    
    # Статус оператора
    is_active_operator = models.BooleanField(
        default=True,
        verbose_name="Активный оператор"
    )
    
    # Зоны доставки (связь с существующей моделью DeliveryZone)
    assigned_zones = models.ManyToManyField(
        'api.DeliveryZone',
        blank=True,
        verbose_name="Назначенные зоны доставки",
        related_name='operators'
    )
    
    # Дополнительные поля
    telegram_id = models.BigIntegerField(
        blank=True,
        null=True,
        unique=True,
        verbose_name="Telegram ID"
    )
    
    # Количество выполненных заказов
    completed_orders_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Количество выполненных заказов"
    )
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Оператор"
        verbose_name_plural = "Операторы"
        ordering = ['-completed_orders_count']
        indexes = [
            models.Index(fields=['is_active_operator']),
            models.Index(fields=['completed_orders_count']),
            models.Index(fields=['telegram_id']),
            models.Index(fields=['phone']),
        ]

    def __str__(self):
        if self.phone:
            return f"{self.get_full_name()} ({self.phone})"
        return f"{self.get_full_name()} (без телефона)"

    @property
    def formatted_phone(self):
        """Отформатированный номер телефона"""
        if not self.phone:
            return None
        
        cleaned = re.sub(r'[\s\-\(\)]', '', str(self.phone))
        
        if cleaned.startswith('998'):
            return f"+{cleaned}"
        
        if len(cleaned) == 9 and cleaned.isdigit():
            return f"+998{cleaned}"
        
        return self.phone

    def get_assigned_zones_names(self):
        """Возвращает названия назначенных зон"""
        return [zone.name for zone in self.assigned_zones.filter(is_active=True)]

    def can_handle_order(self, order):
        """Проверяет, может ли оператор обрабатывать заказ"""
        if not self.is_active_operator:
            return False, "Оператор неактивен"
        
        # Проверяем, есть ли у оператора назначенные зоны
        if not self.assigned_zones.exists():
            return False, "У оператора нет назначенных зон доставки"
        
        # Проверяем, находится ли адрес заказа в зонах оператора
        order_address = order.address
        for zone in self.assigned_zones.filter(is_active=True):
            if zone.is_address_in_zone(order_address.latitude, order_address.longitude):
                return True, f"Заказ в зоне '{zone.name}'"
        
        return False, "Адрес заказа не в зонах оператора"

class OperatorSession(models.Model):
    """
    Модель для отслеживания рабочих сессий операторов
    """
    SESSION_STATUS_CHOICES = (
        ('active', 'Активная'),
        ('completed', 'Завершена'),
        ('cancelled', 'Отменена'),
    )
    
    operator = models.ForeignKey(
        Operator,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name="Оператор"
    )
    
    start_time = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время начала смены"
    )
    
    end_time = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Время окончания смены"
    )
    
    status = models.CharField(
        max_length=20,
        choices=SESSION_STATUS_CHOICES,
        default='active',
        verbose_name="Статус сессии"
    )
    
    # Статистика за сессию
    orders_handled = models.PositiveIntegerField(
        default=0,
        verbose_name="Количество обработанных заказов"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Заметки о смене"
    )

    class Meta:
        verbose_name = "Сессия оператора"
        verbose_name_plural = "Сессии операторов"
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['operator', 'status']),
            models.Index(fields=['start_time']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Сессия {self.operator.get_full_name()} - {self.start_time.strftime('%d.%m.%Y %H:%M')}"

    def end_session(self):
        """Завершает сессию оператора"""
        if self.status == 'active':
            self.end_time = timezone.now()
            self.status = 'completed'
            self.save()

    @property
    def duration(self):
        """Длительность сессии в минутах"""
        if not self.start_time:
            return 0
        end_time = self.end_time or timezone.now()
        duration = end_time - self.start_time
        return int(duration.total_seconds() / 60)

    @property
    def avg_delivery_time(self):
        """Среднее время доставки за сессию"""
        if self.orders_handled > 0 and self.total_delivery_time:
            return self.total_delivery_time / self.orders_handled
        return 0

class OrderAssignment(models.Model):
    """
    Модель для назначения заказов операторам
    """
    ASSIGNMENT_STATUS_CHOICES = (
        ('assigned', 'Назначен'),
        ('accepted', 'Принят'),
        ('rejected', 'Отклонен'),
        ('completed', 'Выполнен'),
    )
    
    order = models.OneToOneField(
        'api.Order',
        on_delete=models.CASCADE,
        related_name='assignment',
        verbose_name="Заказ"
    )
    
    operator = models.ForeignKey(
        Operator,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name="Оператор"
    )
    
    assigned_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время назначения"
    )
    
    accepted_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Время принятия"
    )
    
    status = models.CharField(
        max_length=20,
        choices=ASSIGNMENT_STATUS_CHOICES,
        default='assigned',
        verbose_name="Статус назначения"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Заметки оператора"
    )
    
    rejection_reason = models.TextField(
        blank=True,
        verbose_name="Причина отклонения"
    )

    class Meta:
        verbose_name = "Назначение заказа"
        verbose_name_plural = "Назначения заказов"
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['operator', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_at']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return f"Заказ #{self.order.id} - {self.operator.get_full_name()}"

    def accept_assignment(self):
        """Принимает назначение заказа"""
        if self.status == 'assigned':
            self.status = 'accepted'
            self.accepted_at = timezone.now()
            self.save()

    def reject_assignment(self, reason=""):
        """Отклоняет назначение заказа"""
        if self.status == 'assigned':
            self.status = 'rejected'
            self.rejection_reason = reason
            self.save()

    def complete_assignment(self):
        """Отмечает заказ как выполненный"""
        if self.status == 'accepted':
            self.status = 'completed'
            self.save()

class OrderStatusHistory(models.Model):
    """
    Модель для отслеживания истории изменений статуса заказов
    """
    order = models.ForeignKey(
        'api.Order',
        on_delete=models.CASCADE,
        related_name='status_history',
        verbose_name="Заказ"
    )
    
    operator = models.ForeignKey(
        Operator,
        on_delete=models.CASCADE,
        related_name='status_changes',
        verbose_name="Оператор"
    )
    
    old_status = models.CharField(
        max_length=20,
        verbose_name="Предыдущий статус"
    )
    
    new_status = models.CharField(
        max_length=20,
        verbose_name="Новый статус"
    )
    
    changed_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время изменения"
    )
    
    reason = models.TextField(
        blank=True,
        verbose_name="Причина изменения"
    )

    class Meta:
        verbose_name = "История статуса заказа"
        verbose_name_plural = "История статусов заказов"
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['order', 'changed_at']),
            models.Index(fields=['operator']),
            models.Index(fields=['new_status']),
        ]

    def __str__(self):
        return f"Заказ #{self.order.id}: {self.old_status} → {self.new_status}"

class OperatorNotification(models.Model):
    """
    Модель для уведомлений операторов
    """
    NOTIFICATION_TYPES = (
        ('new_order', 'Новый заказ'),
        ('order_status_change', 'Изменение статуса заказа'),
        ('system', 'Системное уведомление'),
        ('reminder', 'Напоминание'),
    )
    
    operator = models.ForeignKey(
        Operator,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Оператор"
    )
    
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        verbose_name="Тип уведомления"
    )
    
    title = models.CharField(
        max_length=255,
        verbose_name="Заголовок"
    )
    
    message = models.TextField(
        verbose_name="Сообщение"
    )
    
    # Связь с заказом (если применимо)
    order = models.ForeignKey(
        'api.Order',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='operator_notifications',
        verbose_name="Связанный заказ"
    )
    
    is_read = models.BooleanField(
        default=False,
        verbose_name="Прочитано"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время создания"
    )

    class Meta:
        verbose_name = "Уведомление оператора"
        verbose_name_plural = "Уведомления операторов"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['operator', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.operator.get_full_name()}"

class OperatorAnalytics(models.Model):
    """
    Модель для хранения аналитических данных операторов
    """
    operator = models.ForeignKey(
        Operator,
        on_delete=models.CASCADE,
        related_name='analytics',
        verbose_name="Оператор"
    )
    
    date = models.DateField(
        verbose_name="Дата"
    )
    
    # Статистика за день
    total_orders = models.PositiveIntegerField(
        default=0,
        verbose_name="Общее количество заказов"
    )
    
    completed_orders = models.PositiveIntegerField(
        default=0,
        verbose_name="Выполненные заказы"
    )
    
    cancelled_orders = models.PositiveIntegerField(
        default=0,
        verbose_name="Отмененные заказы"
    )
    
    total_delivery_time = models.PositiveIntegerField(
        default=0,
        verbose_name="Общее время доставки (минуты)"
    )
    
    avg_delivery_time = models.PositiveIntegerField(
        default=0,
        verbose_name="Среднее время доставки (минуты)"
    )
    
    total_earnings = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Общий заработок"
    )
    

    class Meta:
        verbose_name = "Аналитика оператора"
        verbose_name_plural = "Аналитика операторов"
        unique_together = ['operator', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['operator', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['avg_delivery_time']),
        ]

    def __str__(self):
        return f"Аналитика {self.operator.get_full_name()} - {self.date}"

    @classmethod
    def update_daily_analytics(cls, operator, date):
        """Обновляет дневную аналитику для оператора"""
        analytics, created = cls.objects.get_or_create(
            operator=operator,
            date=date
        )
        
        # Получаем заказы за день
        start_of_day = datetime.combine(date, datetime.min.time())
        end_of_day = datetime.combine(date, datetime.max.time())
        
        assignments = OrderAssignment.objects.filter(
            operator=operator,
            assigned_at__range=(start_of_day, end_of_day)
        )
        
        # Подсчитываем статистику
        analytics.total_orders = assignments.count()
        analytics.completed_orders = assignments.filter(status='completed').count()
        analytics.cancelled_orders = assignments.filter(status='rejected').count()
        
        # Вычисляем среднее время доставки
        completed_assignments = assignments.filter(status='completed')
        if completed_assignments.exists():
            total_time = sum(
                (assignment.order.updated_at - assignment.accepted_at).total_seconds() / 60
                for assignment in completed_assignments
                if assignment.accepted_at
            )
            analytics.total_delivery_time = int(total_time)
            analytics.avg_delivery_time = int(total_time / analytics.completed_orders)
        
        analytics.save()
        return analytics
