from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings
import secrets
import re

def validate_uzbek_phone_number(value):
    """
    Валидатор для узбекских номеров телефонов
    """
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

class CashierManager(BaseUserManager):
    """Менеджер для модели Cashier"""
    
    def create_user(self, username, email=None, password=None, **extra_fields):
        """Создает обычного кассира"""
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        return self._create_user(username, email, password, **extra_fields)
    
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        """Создает суперпользователя-кассира"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        
        return self._create_user(username, email, password, **extra_fields)
    
    def _create_user(self, username, email, password, **extra_fields):
        """Создает и сохраняет пользователя с заданным username, email и password"""
        if not username:
            raise ValueError('The given username must be set')
        email = self.normalize_email(email)
        username = self.model.normalize_username(username)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

class Cashier(AbstractUser):
    """
    Модель кассира ресторана
    Расширяет стандартную модель User Django
    """
    objects = CashierManager()
    
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
    
    # Связь с рестораном
    restaurant = models.ForeignKey(
        'api.Restaurant',
        on_delete=models.CASCADE,
        related_name='cashiers',
        verbose_name="Ресторан"
    )
    
    # Статус кассира
    is_active_cashier = models.BooleanField(
        default=True,
        verbose_name="Активный кассир"
    )
    
    # Дополнительные поля
    telegram_id = models.BigIntegerField(
        blank=True,
        null=True,
        unique=True,
        verbose_name="Telegram ID"
    )
    
    # Количество обработанных заказов
    processed_orders_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Количество обработанных заказов"
    )
    
    # Переопределяем related_name для избежания конфликтов с Operator
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name="cashier_set",
        related_query_name="cashier",
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name="cashier_set",
        related_query_name="cashier",
    )
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Кассир"
        verbose_name_plural = "Кассиры"
        ordering = ['-processed_orders_count']
        indexes = [
            models.Index(fields=['is_active_cashier']),
            models.Index(fields=['processed_orders_count']),
            models.Index(fields=['telegram_id']),
            models.Index(fields=['phone']),
            models.Index(fields=['restaurant']),
        ]

    def __str__(self):
        if self.phone:
            return f"{self.get_full_name()} ({self.phone}) - {self.restaurant.name}"
        return f"{self.get_full_name()} - {self.restaurant.name}"

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

    def can_handle_order(self, order):
        """Проверяет, может ли кассир обрабатывать заказ"""
        if not self.is_active_cashier:
            return False, "Кассир неактивен"
        
        # Проверяем, что заказ назначен на ресторан кассира
        if not order.restaurant:
            return False, "У заказа не указан ресторан"
        
        if order.restaurant != self.restaurant:
            return False, f"Заказ назначен на ресторан '{order.restaurant.name}', а кассир работает в '{self.restaurant.name}'"
        
        return True, f"Заказ для ресторана '{self.restaurant.name}'"

class CashierSession(models.Model):
    """
    Модель для отслеживания рабочих сессий кассиров
    """
    SESSION_STATUS_CHOICES = (
        ('active', 'Активная'),
        ('completed', 'Завершена'),
        ('cancelled', 'Отменена'),
    )
    
    cashier = models.ForeignKey(
        Cashier,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name="Кассир"
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
    orders_processed = models.PositiveIntegerField(
        default=0,
        verbose_name="Количество обработанных заказов"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Заметки о смене"
    )

    class Meta:
        verbose_name = "Сессия кассира"
        verbose_name_plural = "Сессии кассиров"
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['cashier', 'status']),
            models.Index(fields=['start_time']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Сессия {self.cashier.get_full_name()} - {self.start_time.strftime('%d.%m.%Y %H:%M')}"

    def end_session(self):
        """Завершает сессию кассира"""
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

class OrderProcessing(models.Model):
    """
    Модель для отслеживания обработки заказов кассирами
    """
    PROCESSING_STATUS_CHOICES = (
        ('received', 'Получен'),
        ('preparing', 'Готовится'),
        ('ready', 'Готов'),
        ('delivering', 'Доставляется'),
        ('completed', 'Завершен'),
        ('cancelled', 'Отменен'),
    )
    
    order = models.OneToOneField(
        'api.Order',
        on_delete=models.CASCADE,
        related_name='cashier_processing',
        verbose_name="Заказ"
    )
    
    cashier = models.ForeignKey(
        Cashier,
        on_delete=models.CASCADE,
        related_name='order_processings',
        verbose_name="Кассир"
    )
    
    received_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Время получения заказа"
    )
    
    started_preparing_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Время начала приготовления"
    )
    
    ready_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Время готовности"
    )
    
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Время завершения"
    )
    
    status = models.CharField(
        max_length=20,
        choices=PROCESSING_STATUS_CHOICES,
        default='received',
        verbose_name="Статус обработки"
    )
    
    notes = models.TextField(
        blank=True,
        verbose_name="Заметки кассира"
    )
    
    estimated_time = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name="Оценочное время приготовления (минуты)"
    )

    class Meta:
        verbose_name = "Обработка заказа кассиром"
        verbose_name_plural = "Обработка заказов кассирами"
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['cashier', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['received_at']),
            models.Index(fields=['order']),
        ]

    def __str__(self):
        return f"Заказ #{self.order.id} - {self.cashier.get_full_name()}"

    def start_preparing(self):
        """Начать приготовление заказа"""
        if self.status == 'received':
            self.status = 'preparing'
            self.started_preparing_at = timezone.now()
            self.save()

    def mark_ready(self):
        """Отметить заказ как готовый"""
        if self.status == 'preparing':
            self.status = 'ready'
            self.ready_at = timezone.now()
            self.save()

    def mark_delivering(self):
        """Отметить заказ как отправленный на доставку"""
        if self.status == 'ready':
            self.status = 'delivering'
            self.save()

    def complete(self):
        """Завершить обработку заказа"""
        if self.status in ['ready', 'delivering']:
            self.status = 'completed'
            self.completed_at = timezone.now()
            self.save()

    def cancel(self, reason=""):
        """Отменить обработку заказа"""
        if self.status in ['received', 'preparing']:
            self.status = 'cancelled'
            if reason:
                self.notes = f"Отменен: {reason}"
            self.save()

class CashierNotification(models.Model):
    """
    Модель для уведомлений кассиров
    """
    NOTIFICATION_TYPES = (
        ('new_order', 'Новый заказ'),
        ('order_status_change', 'Изменение статуса заказа'),
        ('system', 'Системное уведомление'),
        ('reminder', 'Напоминание'),
    )
    
    cashier = models.ForeignKey(
        Cashier,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Кассир"
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
        related_name='cashier_notifications',
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
        verbose_name = "Уведомление кассира"
        verbose_name_plural = "Уведомления кассиров"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cashier', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.cashier.get_full_name()}"

class CashierAnalytics(models.Model):
    """
    Модель для хранения аналитических данных кассиров
    """
    cashier = models.ForeignKey(
        Cashier,
        on_delete=models.CASCADE,
        related_name='analytics',
        verbose_name="Кассир"
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
        verbose_name="Завершенные заказы"
    )
    
    cancelled_orders = models.PositiveIntegerField(
        default=0,
        verbose_name="Отмененные заказы"
    )
    
    avg_preparation_time = models.PositiveIntegerField(
        default=0,
        verbose_name="Среднее время приготовления (минуты)"
    )
    
    total_revenue = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Общая выручка"
    )

    class Meta:
        verbose_name = "Аналитика кассира"
        verbose_name_plural = "Аналитика кассиров"
        unique_together = ['cashier', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['cashier', 'date']),
            models.Index(fields=['date']),
            models.Index(fields=['avg_preparation_time']),
        ]

    def __str__(self):
        return f"Аналитика {self.cashier.get_full_name()} - {self.date}"

class CashierToken(models.Model):
    """
    Модель токенов для кассиров
    """
    key = models.CharField(max_length=40, primary_key=True, verbose_name="Ключ")
    cashier = models.ForeignKey(
        Cashier,
        on_delete=models.CASCADE,
        related_name='auth_tokens',
        verbose_name="Кассир"
    )
    created = models.DateTimeField(auto_now_add=True, verbose_name="Создан")

    class Meta:
        verbose_name = "Токен кассира"
        verbose_name_plural = "Токены кассиров"

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super().save(*args, **kwargs)

    def generate_key(self):
        # Генерируем ровно 40-символьный ключ в шестнадцатеричном формате,
        # чтобы он гарантированно помещался в CharField(max_length=40)
        # 20 байт -> 40 hex символов
        return secrets.token_hex(20)

    def __str__(self):
        return f"Токен для {self.cashier.get_full_name()}"
