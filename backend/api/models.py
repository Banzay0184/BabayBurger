import os
import requests
import math
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
import re

def get_coordinates_from_address(address_string):
    """
    Получает координаты по адресу через Яндекс.Карты API
    """
    try:
        api_key = getattr(settings, 'YANDEX_MAPS_API_KEY', None)
        if not api_key:
            return None, None
        
        url = 'https://geocode-maps.yandex.ru/1.x/'
        params = {
            'apikey': api_key,
            'geocode': address_string,
            'format': 'json',
            'lang': 'ru_RU',
        }
        
        response = requests.get(url, params=params, timeout=5)
        if response.status_code != 200:
            return None, None
        
        data = response.json()
        feature_member = data['response']['GeoObjectCollection']['featureMember']
        
        if feature_member:
            pos = feature_member[0]['GeoObject']['Point']['pos']
            lon, lat = pos.split()
            return float(lat), float(lon)
        
        return None, None
        
    except Exception as e:
        print(f"Ошибка геокодирования: {e}")
        return None, None

def validate_uzbek_phone_number(value):
    """
    Валидатор для узбекских номеров телефонов
    Поддерживает форматы:
    - +998 90 123 45 67
    - +998901234567
    - 998901234567
    - 901234567
    
    Коды операторов Узбекистана:
    - 90, 91, 93, 94, 95, 97, 98, 99 (мобильные)
    - 88, 77 (мобильные)
    """
    # Убираем все пробелы, дефисы, скобки
    cleaned = re.sub(r'[\s\-\(\)]', '', str(value))
    
    # Проверяем базовую структуру
    if not cleaned.isdigit() and not cleaned.startswith('+998'):
        raise ValidationError(
            'Введите корректный узбекский номер телефона. '
            'Примеры: +998 90 123 45 67, +998901234567, 901234567'
        )
    
    # Если номер начинается с +998, убираем код страны
    if cleaned.startswith('+998'):
        cleaned = cleaned[4:]  # Убираем +998
    elif cleaned.startswith('998'):
        cleaned = cleaned[3:]  # Убираем 998
    
    # Проверяем длину (должно быть 9-12 цифр после кода страны для гибкости)
    if len(cleaned) < 9 or len(cleaned) > 12:
        raise ValidationError(
            'Номер должен содержать от 9 до 12 цифр после кода страны. '
            'Примеры: +998 90 123 45 67, +998901234567, 901234567'
        )
    
    # Проверяем код оператора (первые 2 цифры)
    operator_code = cleaned[:2]
    valid_operators = ['90', '91', '93', '94', '95', '97', '98', '99', '88', '77']
    
    if operator_code not in valid_operators:
        raise ValidationError(
            f'Неверный код оператора: {operator_code}. '
            f'Допустимые коды: {", ".join(valid_operators)}'
        )
    
    # Проверяем, что остальные цифры не все одинаковые (только если номер 9 цифр)
    if len(cleaned) == 9:
        remaining_digits = cleaned[2:]
        if len(set(remaining_digits)) == 1:
            raise ValidationError(
                'Номер не может состоять из повторяющихся цифр'
            )

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Вычисляет расстояние между двумя точками в километрах
    Использует формулу гаверсинуса
    """
    R = 6371  # Радиус Земли в километрах
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

class DeliveryZone(models.Model):
    """Модель для хранения зон доставки"""
    name = models.CharField(max_length=100, verbose_name="Название зоны")
    city = models.CharField(max_length=100, verbose_name="Город")
    
    # Центр зоны доставки (необязательно, если есть полигон)
    center_latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        verbose_name="Широта центра",
        null=True,
        blank=True,
        help_text="Необязательно, если задан полигон"
    )
    center_longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        verbose_name="Долгота центра",
        null=True,
        blank=True,
        help_text="Необязательно, если задан полигон"
    )
    
    # Радиус зоны доставки в километрах (необязательно, если есть полигон)
    radius_km = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(0.1), MaxValueValidator(100)],
        verbose_name="Радиус зоны (км)",
        null=True,
        blank=True,
        help_text="Необязательно, если задан полигон"
    )
    
    # Стоимость доставки в зоне
    delivery_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Стоимость доставки"
    )
    
    # Минимальная сумма заказа для бесплатной доставки
    min_order_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True, 
        verbose_name="Минимальная сумма для бесплатной доставки"
    )
    
    # Статус зоны
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    
    # Координаты полигона для точных границ зоны
    polygon_coordinates = models.JSONField(
        null=True, 
        blank=True, 
        verbose_name="Координаты полигона",
        help_text="Массив координат [[широта, долгота], ...] для точных границ зоны"
    )
    
    # Стилизация полигона
    polygon_fill_color = models.CharField(
        max_length=7,
        default='#ffd21e',
        verbose_name="Цвет заливки полигона",
        help_text="Цвет в формате #RRGGBB (например: #ffd21e)"
    )
    
    polygon_fill_opacity = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.6,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name="Прозрачность заливки",
        help_text="От 0.0 (прозрачно) до 1.0 (непрозрачно)"
    )
    
    polygon_stroke_color = models.CharField(
        max_length=7,
        default='#ffd21e',
        verbose_name="Цвет обводки полигона",
        help_text="Цвет в формате #RRGGBB (например: #ffd21e)"
    )
    
    polygon_stroke_width = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        verbose_name="Ширина обводки",
        help_text="Ширина линии в пикселях"
    )
    
    polygon_stroke_opacity = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.9,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        verbose_name="Прозрачность обводки",
        help_text="От 0.0 (прозрачно) до 1.0 (непрозрачно)"
    )
    
    class Meta:
        verbose_name = "Зона доставки"
        verbose_name_plural = "Зоны доставки"
        ordering = ['city', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.city})"
    
    def is_address_in_zone(self, latitude, longitude):
        """Проверяет, находится ли адрес в зоне доставки"""
        try:
            # Если есть полигон, используем его для проверки
            if self.polygon_coordinates and len(self.polygon_coordinates) > 2:
                return self._is_point_in_polygon(latitude, longitude)
            
            # Если нет полигона, но есть центр и радиус, используем радиус
            elif self.center_latitude and self.center_longitude and self.radius_km:
                distance = calculate_distance(
                    latitude, longitude,
                    self.center_latitude, self.center_longitude
                )
                return distance <= self.radius_km
            
            # Временное решение для существующих зон
            elif self.name in ["Бухара", "Центр Бухары"]:
                if self.name == "Бухара":
                    return True  # Вся Бухара
                elif self.name == "Центр Бухары":
                    # Проверяем расстояние до центра Бухары
                    bukhara_center_lat, bukhara_center_lon = 39.7681, 64.4556
                    distance = calculate_distance(latitude, longitude, bukhara_center_lat, bukhara_center_lon)
                    return distance <= 10  # 10 км от центра
            
            return False
            
        except Exception as e:
            print(f"Ошибка проверки зоны доставки: {e}")
            return False
    
    def _is_point_in_polygon(self, lat, lon):
        """Проверяет, находится ли точка внутри полигона (алгоритм ray casting)"""
        try:
            if not self.polygon_coordinates or len(self.polygon_coordinates) < 3:
                return False
            
            # Преобразуем координаты в нужный формат
            polygon = self.polygon_coordinates
            
            # Алгоритм ray casting
            inside = False
            j = len(polygon) - 1
            
            for i in range(len(polygon)):
                if ((polygon[i][1] > lat) != (polygon[j][1] > lat)) and \
                   (lon < (polygon[j][0] - polygon[i][0]) * (lat - polygon[i][1]) / 
                    (polygon[j][1] - polygon[i][1]) + polygon[i][0]):
                    inside = not inside
                j = i
            
            return inside
            
        except Exception as e:
            print(f"Ошибка проверки точки в полигоне: {e}")
            return False
    
    def get_distance_to_zone(self, latitude, longitude):
        """Вычисляет расстояние от точки до зоны доставки"""
        try:
            # Если есть полигон, вычисляем расстояние до ближайшей точки полигона
            if self.polygon_coordinates and len(self.polygon_coordinates) > 2:
                min_distance = float('inf')
                for point in self.polygon_coordinates:
                    distance = calculate_distance(latitude, longitude, point[0], point[1])
                    min_distance = min(min_distance, distance)
                return min_distance
            
            # Если есть центр и радиус, вычисляем расстояние до центра
            elif self.center_latitude and self.center_longitude:
                return calculate_distance(
                    latitude, longitude,
                    self.center_latitude, self.center_longitude
                )
            
            # Fallback для старых зон
            elif self.name in ["Бухара", "Центр Бухары"]:
                if self.name == "Бухара":
                    # Расстояние до центра Бухары
                    bukhara_center_lat, bukhara_center_lon = 39.7681, 64.4556
                    return calculate_distance(latitude, longitude, bukhara_center_lat, bukhara_center_lon)
                elif self.name == "Центр Бухары":
                    bukhara_center_lat, bukhara_center_lon = 39.7681, 64.4556
                    return calculate_distance(latitude, longitude, bukhara_center_lat, bukhara_center_lon)
            
            return None
            
        except Exception as e:
            print(f"Ошибка вычисления расстояния до зоны: {e}")
            return None


class Restaurant(models.Model):
    """Модель для ресторанов с самовывозом"""
    name = models.CharField(max_length=100, verbose_name="Название ресторана")
    address = models.CharField(max_length=200, verbose_name="Адрес ресторана")
    city = models.CharField(max_length=100, verbose_name="Город")
    
    # Координаты ресторана
    latitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        verbose_name="Широта",
        null=True,
        blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, 
        decimal_places=6,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        verbose_name="Долгота",
        null=True,
        blank=True
    )
    
    # Настройки самовывоза
    pickup_available = models.BooleanField(default=True, verbose_name="Доступен самовывоз")
    min_order_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0,
        verbose_name="Минимальная сумма заказа для самовывоза"
    )
    pickup_time = models.CharField(
        max_length=100, 
        default="15-20 минут",
        verbose_name="Время готовности для самовывоза"
    )
    
    # Дополнительная информация
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name="Телефон")
    working_hours = models.CharField(max_length=100, blank=True, null=True, verbose_name="Часы работы")
    description = models.TextField(blank=True, null=True, verbose_name="Описание")
    
    # Статус
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Дата обновления")
    
    class Meta:
        verbose_name = "Ресторан"
        verbose_name_plural = "Рестораны"
        ordering = ['city', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.address}"
    
    def get_full_address(self):
        """Возвращает полный адрес ресторана"""
        return f"{self.address}, {self.city}"

class User(models.Model):
    telegram_id = models.BigIntegerField(unique=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['telegram_id']),  # Для поиска по telegram_id
            models.Index(fields=['created_at']),  # Для сортировки по дате создания
        ]

    def __str__(self):
        full_name = f"{self.first_name}"
        if self.last_name:
            full_name += f" {self.last_name}"
        if self.username:
            full_name += f" (@{self.username})"
        return full_name
    
class Address(models.Model):
    """Модель для хранения адресов доставки с координатами"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    
    # Основные поля адреса
    street = models.CharField(max_length=255, verbose_name="Улица")
    house_number = models.CharField(max_length=20, verbose_name="Номер дома")
    apartment = models.CharField(max_length=20, blank=True, null=True, verbose_name="Квартира")
    city = models.CharField(max_length=100, default="Ташкент", verbose_name="Город")
    
    # Координаты для карт
    latitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7, 
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        blank=True, 
        null=True,
        verbose_name="Широта"
    )
    longitude = models.DecimalField(
        max_digits=10, 
        decimal_places=7, 
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        blank=True, 
        null=True,
        verbose_name="Долгота"
    )
    
    # Дополнительные поля
    is_primary = models.BooleanField(default=False, verbose_name="Основной адрес")
    phone_number = models.CharField(
        max_length=20, 
        verbose_name="Номер телефона",
        validators=[validate_uzbek_phone_number],
        help_text="Формат: +998 90 123 45 67 или 901234567"
    )
    comment = models.TextField(blank=True, null=True, verbose_name="Комментарий к адресу")
    
    # Метаданные
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Адрес"
        verbose_name_plural = "Адреса"
        ordering = ['-is_primary', '-created_at']
        # Уникальный индекс для предотвращения дублирования адресов
        unique_together = [
            ('user', 'street', 'house_number', 'apartment', 'city')
        ]
        indexes = [
            models.Index(fields=['user', 'is_primary']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['user']),  # Для запросов только по пользователю
            models.Index(fields=['is_primary']),  # Для запросов по основным адресам
            models.Index(fields=['created_at']),  # Для сортировки по дате создания
            models.Index(fields=['city']),  # Для фильтрации по городу
            models.Index(fields=['user', 'city']),  # Для запросов пользователя по городу
            models.Index(fields=['user', 'is_primary', 'created_at']),  # Составной индекс для основных запросов
        ]

    def __str__(self):
        return f"{self.user.first_name} - {self.full_address}"

    @property
    def full_address(self):
        """Полный адрес в строковом формате"""
        address_parts = [self.street, self.house_number]
        if self.apartment:
            address_parts.append(f"кв. {self.apartment}")
        address_parts.append(self.city)
        return ", ".join(address_parts)

    @property
    def coordinates(self):
        """Координаты в формате для карт"""
        if self.latitude and self.longitude:
            return f"{self.latitude},{self.longitude}"
        return None

    @property
    def formatted_phone(self):
        """Отформатированный номер телефона"""
        if not self.phone_number:
            return None
        
        # Убираем все пробелы и дефисы
        cleaned = re.sub(r'[\s\-\(\)]', '', str(self.phone_number))
        
        # Если номер начинается с 998, добавляем +
        if cleaned.startswith('998'):
            return f"+{cleaned}"
        
        # Если номер 9 цифр, добавляем +998
        if len(cleaned) == 9 and cleaned.isdigit():
            return f"+998{cleaned}"
        
        return self.phone_number

    def clean(self):
        """Дополнительная валидация при сохранении"""
        super().clean()
        
        # Проверяем, что если это основной адрес, то у пользователя нет других основных
        if self.is_primary and self.pk is None:  # Новый адрес
            if Address.objects.filter(user=self.user, is_primary=True).exists():
                raise ValidationError({
                    'is_primary': 'У пользователя уже есть основной адрес. '
                                 'Создайте адрес как обычный, или измените существующий основной.'
                })
        
        # Проверяем зону доставки при наличии координат
        if self.latitude and self.longitude:
            is_in_zone, message = self.is_in_delivery_zone()
            if not is_in_zone:
                raise ValidationError({
                    'city': f'Адрес не находится в зоне доставки: {message}'
                })

    def save(self, *args, **kwargs):
        """При сохранении, если это основной адрес, снимаем флаг с других адресов пользователя"""
        # Валидируем номер телефона перед сохранением
        if self.phone_number:
            validate_uzbek_phone_number(self.phone_number)
        
        # Автоматическое геокодирование координат, если они не указаны
        if (not self.latitude or not self.longitude) and self.street and self.house_number:
            address_string = self.full_address
            lat, lon = get_coordinates_from_address(address_string)
            
            if lat and lon:
                self.latitude = lat
                self.longitude = lon
                print(f"Автоматически получены координаты для адреса '{address_string}': {lat}, {lon}")
            else:
                print(f"Не удалось получить координаты для адреса '{address_string}'")
        
        if self.is_primary:
            Address.objects.filter(user=self.user, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)
    
    def is_in_delivery_zone(self):
        """
        Проверяет, находится ли адрес в зоне доставки
        """
        print(f"🔍 Проверяем адрес: {self.full_address}")
        print(f"🔍 Координаты: lat={self.latitude}, lon={self.longitude}")
        print(f"🔍 Город: {self.city}")
        
        if not self.latitude or not self.longitude:
            print("❌ Координаты адреса не определены")
            return False, "Координаты адреса не определены"
        
        # Временное решение: если адрес в Бухаре и есть координаты, разрешить доставку
        if self.city == 'Бухара' and self.latitude and self.longitude:
            print("🔍 Временное решение: адрес в Бухаре, разрешаем доставку")
            return True, "Адрес в Бухаре - доставка разрешена (временное решение)"
        
        # Получаем активные зоны доставки для города
        delivery_zones = DeliveryZone.objects.filter(
            city__iexact=self.city,
            is_active=True
        )
        
        print(f"🔍 Найдено зон доставки для города '{self.city}': {delivery_zones.count()}")
        
        if not delivery_zones.exists():
            print(f"❌ Доставка в город '{self.city}' не осуществляется")
            return False, f"Доставка в город '{self.city}' не осуществляется"
        
        # Проверяем каждую зону доставки
        for zone in delivery_zones:
            print(f"🔍 Проверяем зону: {zone.name}")
            if zone.is_address_in_zone(self.latitude, self.longitude):
                print(f"✅ Адрес находится в зоне доставки '{zone.name}'")
                return True, f"Адрес находится в зоне доставки '{zone.name}'"
        
        # Если адрес не входит ни в одну зону, находим ближайшую
        print("🔍 Адрес не входит ни в одну зону, ищем ближайшую")
        closest_zone = None
        min_distance = float('inf')
        
        for zone in delivery_zones:
            distance = zone.get_distance_to_zone(self.latitude, self.longitude)
            print(f"🔍 Расстояние до зоны '{zone.name}': {distance:.1f}км")
            if distance and distance < min_distance:
                min_distance = distance
                closest_zone = zone
        
        if closest_zone:
            print(f"❌ Адрес находится на расстоянии {min_distance:.1f} км от зоны доставки '{closest_zone.name}'")
            return False, f"Адрес находится на расстоянии {min_distance:.1f} км от зоны доставки '{closest_zone.name}'"
        
        print("❌ Не удалось определить зону доставки")
        return False, "Не удалось определить зону доставки"
    
    def get_delivery_zones_info(self):
        """
        Возвращает информацию о доступных зонах доставки для города
        """
        zones = DeliveryZone.objects.filter(
            city__iexact=self.city,
            is_active=True
        )
        
        zones_info = []
        for zone in zones:
            distance = None
            if self.latitude and self.longitude:
                distance = zone.get_distance_to_zone(self.latitude, self.longitude)
            
            zones_info.append({
                'name': zone.name,
                'radius_km': float(zone.radius_km) if zone.radius_km else None,
                'distance': distance,
                'is_in_zone': zone.is_address_in_zone(self.latitude, self.longitude) if self.latitude and self.longitude else False
            })
        
        return zones_info
    
class Category(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),  # Для поиска по названию
            models.Index(fields=['created_at']),  # Для сортировки по дате создания
        ]
    
    def __str__(self):
        return self.name

# --- START: ДОРАБОТКИ ДЛЯ АКЦИЙ, ХИТОВ, КАСТОМИЗАЦИИ, РАЗМЕРОВ ---

class Promotion(models.Model):
    """Модель для акций и скидок"""
    DISCOUNT_TYPES = (
        ('PERCENT', 'Процентная скидка'),
        ('FIXED_AMOUNT', 'Фиксированная сумма'),
        ('FREE_ITEM', 'Бесплатный товар'),
        ('FREE_DELIVERY', 'Бесплатная доставка'),
    )
    name = models.CharField(max_length=255, verbose_name="Название акции")
    description = models.TextField(blank=True, verbose_name="Описание")
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES, verbose_name="Тип скидки")
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Значение скидки")
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, verbose_name="Минимальная сумма заказа")
    
    # Максимальная сумма скидки
    max_discount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        blank=True, 
        null=True, 
        verbose_name="Максимальная сумма скидки"
    )
    
    # Количество использований акции
    usage_count = models.PositiveIntegerField(
        default=0, 
        verbose_name="Количество использований"
    )
    
    # Максимальное количество использований
    max_uses = models.PositiveIntegerField(
        blank=True, 
        null=True, 
        verbose_name="Максимальное количество использований"
    )
    
    valid_from = models.DateTimeField(verbose_name="Действует с")
    valid_to = models.DateTimeField(verbose_name="Действует до")
    is_active = models.BooleanField(default=True, verbose_name="Активна")
    applicable_items = models.ManyToManyField('MenuItem', blank=True, verbose_name="Применимые блюда")
    free_item = models.ForeignKey('MenuItem', on_delete=models.SET_NULL, blank=True, null=True, related_name='free_in_promotions', verbose_name="Бесплатный товар")
    free_addon = models.ForeignKey('AddOn', on_delete=models.SET_NULL, blank=True, null=True, related_name='free_in_promotions', verbose_name="Бесплатное дополнение")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Акция"
        verbose_name_plural = "Акции"
        ordering = ['-valid_from']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['valid_from', 'valid_to']),
            models.Index(fields=['discount_type']),
            models.Index(fields=['usage_count']),
            models.Index(fields=['max_uses']),
            models.Index(fields=['is_active', 'valid_from', 'valid_to']),
        ]

    def __str__(self):
        return self.name

    def is_valid(self):
        from django.utils import timezone
        now = timezone.now()
        
        # Проверяем базовые условия
        if not self.is_active or self.valid_from > now or self.valid_to < now:
            return False
        
        # Проверяем лимит использований
        if self.max_uses and self.usage_count >= self.max_uses:
            return False
        
        # Проверяем активность бесплатного товара/дополнения
        if self.discount_type == 'FREE_ITEM':
            if self.free_item and not self.free_item.is_active:
                return False
            if self.free_addon and not self.free_addon.is_active:
                return False
        
        return True

    def calculate_discount(self, order_total, delivery_fee=0):
        if not self.is_valid():
            return 0, delivery_fee
        
        if self.min_order_amount and order_total < self.min_order_amount:
            return 0, delivery_fee
        
        discount_amount = 0
        
        if self.discount_type == 'PERCENT':
            discount_amount = (order_total * self.discount_value) / 100
            # Ограничиваем максимальной скидкой
            if self.max_discount:
                discount_amount = min(discount_amount, self.max_discount)
        elif self.discount_type == 'FIXED_AMOUNT':
            discount_amount = min(self.discount_value, order_total)
        elif self.discount_type == 'FREE_DELIVERY':
            return 0, 0
        elif self.discount_type == 'FREE_ITEM':
            return 0, delivery_fee
        
        return discount_amount, delivery_fee

class AddOn(models.Model):
    """Модель для дополнительных опций (соусы, дополнения)"""
    name = models.CharField(max_length=255, verbose_name="Название")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Цена")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, blank=True, null=True, verbose_name="Категория")
    
    # Категории, для которых доступно это дополнение
    available_for_categories = models.ManyToManyField(
        Category, 
        blank=True, 
        related_name='available_addons',
        verbose_name="Доступно для категорий"
    )
    
    is_active = models.BooleanField(default=True, verbose_name="Активно")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Дополнение"
        verbose_name_plural = "Дополнения"
        ordering = ['category', 'name']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['price']),
            models.Index(fields=['category', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.price} UZS)"

class SizeOption(models.Model):
    """Модель для вариантов размеров (например, пиццы)"""
    name = models.CharField(max_length=50, verbose_name="Название размера")
    price_modifier = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Модификатор цены")
    
    # Описание размера
    description = models.TextField(
        blank=True, 
        verbose_name="Описание размера",
        help_text="Например: 30 см, 8 кусочков"
    )
    
    menu_item = models.ForeignKey('MenuItem', on_delete=models.CASCADE, blank=True, null=True, verbose_name="Блюдо")
    is_active = models.BooleanField(default=True, verbose_name="Активно")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Размер"
        verbose_name_plural = "Размеры"
        unique_together = ['name', 'menu_item']
        ordering = ['price_modifier']
        indexes = [
            models.Index(fields=['menu_item']),
            models.Index(fields=['is_active']),
            models.Index(fields=['price_modifier']),
        ]

    def __str__(self):
        return f"{self.name} ({self.price_modifier:+} UZS)"

# --- END: ДОРАБОТКИ ДЛЯ АКЦИЙ, ХИТОВ, КАСТОМИЗАЦИИ, РАЗМЕРОВ ---

# --- ДОРАБОТКА MenuItem ---
class MenuItem(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='menu_items/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_hit = models.BooleanField(default=False, verbose_name="Хит продаж")
    is_new = models.BooleanField(default=False, verbose_name="Новинка")
    is_active = models.BooleanField(default=True, verbose_name="Активно")
    
    # Порядок отображения для сортировки
    priority = models.PositiveIntegerField(
        default=0, 
        verbose_name="Порядок отображения",
        help_text="Чем меньше число, тем выше в списке"
    )
    
    size_options = models.ManyToManyField(SizeOption, blank=True, verbose_name="Доступные размеры")
    add_on_options = models.ManyToManyField(AddOn, blank=True, verbose_name="Доступные дополнения")

    class Meta:
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['price']),
            models.Index(fields=['created_at']),
            models.Index(fields=['category', 'created_at']),
            models.Index(fields=['is_hit']),
            models.Index(fields=['is_new']),
            models.Index(fields=['is_active']),
            models.Index(fields=['priority']),
            models.Index(fields=['is_hit', 'priority', 'created_at']),
            models.Index(fields=['is_new', 'priority', 'created_at']),
            models.Index(fields=['is_active', 'priority', 'created_at']),
        ]
        ordering = ['priority', '-created_at']

    def __str__(self):
        return self.name

    @property
    def available_sizes(self):
        return self.size_options.filter(is_active=True)

    @property
    def available_add_ons(self):
        return self.add_on_options.filter(is_active=True)

# --- ДОРАБОТКА OrderItem ---
class OrderItem(models.Model):
    order = models.ForeignKey('Order', on_delete=models.CASCADE)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    size_option = models.ForeignKey(SizeOption, on_delete=models.SET_NULL, blank=True, null=True, verbose_name="Выбранный размер")
    add_ons = models.ManyToManyField(AddOn, blank=True, verbose_name="Добавленные дополнения")

    class Meta:
        indexes = [
            models.Index(fields=['order']),
            models.Index(fields=['menu_item']),
            models.Index(fields=['order', 'menu_item']),
            models.Index(fields=['size_option']),
        ]

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} in Order #{self.order.id}"

    def calculate_total(self):
        base_price = self.menu_item.price
        if self.size_option:
            base_price += self.size_option.price_modifier
        add_ons_total = sum(addon.price for addon in self.add_ons.all())
        total = (base_price + add_ons_total) * self.quantity
        return total

    def clean(self):
        super().clean()
        if self.size_option and self.menu_item:
            if self.size_option not in self.menu_item.available_sizes:
                raise ValidationError({'size_option': f'Размер "{self.size_option.name}" недоступен для блюда "{self.menu_item.name}"'})
        
        if self.add_ons.exists() and self.menu_item:
            available_add_ons = self.menu_item.available_add_ons
            for addon in self.add_ons.all():
                if addon not in available_add_ons:
                    raise ValidationError({'add_ons': f'Дополнение "{addon.name}" недоступно для блюда "{self.menu_item.name}"'})
                
                # Проверяем, что дополнение доступно для категории блюда
                if addon.available_for_categories.exists():
                    if self.menu_item.category not in addon.available_for_categories.all():
                        raise ValidationError({
                            'add_ons': f'Дополнение "{addon.name}" недоступно для категории "{self.menu_item.category.name}"'
                        })

# --- Промокоды ---
class PromoCode(models.Model):
    """Модель для промокодов"""
    code = models.CharField(max_length=20, unique=True, verbose_name="Код промокода")
    discount_percent = models.IntegerField(verbose_name="Процент скидки", help_text="Скидка в процентах (0-100)")
    max_discount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Максимальная скидка в сумах",
        help_text="Максимальная сумма скидки в сумах"
    )
    min_order_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        verbose_name="Минимальная сумма заказа",
        help_text="Минимальная сумма заказа для применения промокода"
    )
    is_active = models.BooleanField(default=True, verbose_name="Активен")
    max_uses = models.PositiveIntegerField(
        default=1, 
        verbose_name="Максимальное количество использований",
        help_text="Сколько раз можно использовать промокод (0 = безлимит)"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата создания")
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Дата истечения")
    
    class Meta:
        verbose_name = "Промокод"
        verbose_name_plural = "Промокоды"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} ({self.discount_percent}%)"
    
    def is_valid(self, user, order_amount):
        """Проверяет валидность промокода"""
        if not self.is_active:
            return False, "Промокод неактивен"
        
        if self.expires_at and timezone.now() > self.expires_at:
            return False, "Промокод истек"
        
        if order_amount < self.min_order_amount:
            return False, f"Минимальная сумма заказа: {self.min_order_amount} сум"
        
        # Проверяем, использовал ли пользователь этот промокод
        if user and PromoCodeUsage.objects.filter(promo_code=self, user=user).exists():
            return False, "Вы уже использовали этот промокод"
        
        # Проверяем лимит использований
        if self.max_uses > 0:
            usage_count = PromoCodeUsage.objects.filter(promo_code=self).count()
            if usage_count >= self.max_uses:
                return False, "Промокод больше недоступен (достигнут лимит использований)"
        
        return True, "Промокод валиден"
    
    def calculate_discount(self, order_amount):
        """Рассчитывает скидку по промокоду"""
        discount_amount = (order_amount * self.discount_percent) / 100
        return min(discount_amount, self.max_discount)
    
    def mark_as_used(self, user):
        """Отмечает промокод как использованный конкретным пользователем"""
        PromoCodeUsage.objects.create(
            promo_code=self,
            user=user,
            used_at=timezone.now()
        )


class PromoCodeUsage(models.Model):
    """Модель для отслеживания использований промокодов пользователями"""
    promo_code = models.ForeignKey(
        PromoCode, 
        on_delete=models.CASCADE, 
        verbose_name="Промокод"
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        verbose_name="Пользователь"
    )
    used_at = models.DateTimeField(auto_now_add=True, verbose_name="Дата использования")
    
    class Meta:
        verbose_name = "Использование промокода"
        verbose_name_plural = "Использования промокодов"
        unique_together = ['promo_code', 'user']  # Один пользователь - один раз на промокод
        ordering = ['-used_at']
    
    def __str__(self):
        return f"{self.user.first_name} использовал {self.promo_code.code}"


# --- ДОРАБОТКА Order ---
class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Ожидает обработки'),

        ('assigned', 'Назначен оператору'),
        ('operator_processing', 'Обрабатывается оператором'),
        ('confirmed', 'Подтвержден клиентом'),
        ('preparing', 'Готовится'),
        ('ready_for_delivery', 'Готов к доставке'),
        ('delivering', 'Доставляется'),
        ('completed', 'Выполнен'),
        ('cancelled', 'Отменен'),
        ('rejected', 'Отклонен'),
    )
    
    SERVICE_TYPE_CHOICES = (
        ('delivery', 'Доставка'),
        ('pickup', 'Самовывоз'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, verbose_name="Ресторан", null=True, blank=True)
    items = models.ManyToManyField(MenuItem, through='OrderItem')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    service_type = models.CharField(max_length=20, choices=SERVICE_TYPE_CHOICES, default='delivery', verbose_name="Тип услуги")
    address = models.ForeignKey(Address, on_delete=models.CASCADE, verbose_name="Адрес доставки")
    phone = models.CharField(max_length=20, verbose_name="Телефон")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    promotion = models.ForeignKey(Promotion, on_delete=models.SET_NULL, blank=True, null=True, verbose_name="Примененная акция")
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Стоимость доставки")
    discounted_total = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Итоговая сумма после скидки")
    promo_code = models.ForeignKey(
        PromoCode, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        verbose_name="Промокод"
    )
    discount_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Сумма скидки"
    )
    final_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0, 
        verbose_name="Итоговая стоимость"
    )
    
    # Время доставки
    delivery_time = models.DateTimeField(
        blank=True, 
        null=True, 
        verbose_name="Время доставки"
    )
    
    # Примечания к заказу
    notes = models.TextField(
        blank=True, 
        verbose_name="Примечания к заказу",
        help_text="Комментарии клиента"
    )
    
    # Поля для работы с операторами
    operator_notes = models.TextField(
        blank=True,
        verbose_name="Заметки оператора",
        help_text="Внутренние заметки оператора"
    )
    
    operator_called = models.BooleanField(
        default=False,
        verbose_name="Оператор звонил"
    )
    
    operator_call_time = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Время звонка оператора"
    )
    
    operator_call_result = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Результат звонка",
        choices=(
            ('confirmed', 'Подтвержден'),
            ('cancelled', 'Отменен'),
            ('modified', 'Изменен'),
            ('unreachable', 'Не дозвонился'),
            ('wrong_number', 'Неверный номер'),
        )
    )
    
    assigned_operator = models.ForeignKey(
        'app_operator.Operator',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name="Назначенный оператор"
    )
    
    assigned_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Время назначения оператору"
    )

    class Meta:
        verbose_name = "Заказ"
        verbose_name_plural = "Заказы"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['delivery_time']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"Order #{self.id} by {self.user}"

    def save(self, *args, **kwargs):
        """Автоматически рассчитывает итоговую стоимость при сохранении"""
        # total_price уже включает delivery_fee, поэтому не добавляем его снова
        self.final_price = self.total_price - self.discount_amount
        super().save(*args, **kwargs)

    def calculate_total(self):
        total = 0
        for item in self.orderitem_set.all():
            item_total = item.calculate_total()
            total += item_total
        return total

    def apply_promotion(self):
        # Получаем информацию о зоне доставки (без блокировки)
        is_in_zone, message = self.address.is_in_delivery_zone()
        if not is_in_zone:
            print(f"⚠️ Предупреждение: адрес не в зоне доставки: {message}")
            print(f"⚠️ Оператор может принять решение о доставке самостоятельно")
        
        # Получаем базовую стоимость доставки из зоны (без учета min_order_amount зоны)
        base_delivery_fee = 0
        delivery_zones = DeliveryZone.objects.filter(
            city__iexact=self.address.city,
            is_active=True
        )
        
        # Сначала ищем зону, в которой находится адрес
        for zone in delivery_zones:
            if zone.is_address_in_zone(self.address.latitude, self.address.longitude):
                base_delivery_fee = zone.delivery_fee
                break
        
        # Если адрес не в зоне, используем стоимость доставки из ближайшей зоны
        if base_delivery_fee == 0 and delivery_zones.exists():
            closest_zone = None
            min_distance = float('inf')
            
            for zone in delivery_zones:
                distance = zone.get_distance_to_zone(self.address.latitude, self.address.longitude)
                if distance and distance < min_distance:
                    min_distance = distance
                    closest_zone = zone
            
            if closest_zone:
                base_delivery_fee = closest_zone.delivery_fee
                print(f"⚠️ Адрес вне зоны, используем стоимость доставки из ближайшей зоны '{closest_zone.name}': {base_delivery_fee}")
        
        # Если акция не выбрана, автоматически применяем лучшую доступную
        if not self.promotion:
            self.promotion = self.get_best_available_promotion()
        
        # Отладочная информация
        print(f"🔍 Отладка apply_promotion:")
        print(f"   - Заказ ID: {self.id}")
        print(f"   - Сумма заказа: {self.calculate_total()}")
        print(f"   - Базовая стоимость доставки: {base_delivery_fee}")
        print(f"   - Выбранная акция: {self.promotion.name if self.promotion else 'Нет'}")
        
        if not self.promotion or not self.promotion.is_valid():
            print(f"   - Акция не валидна или не выбрана")
            # Применяем базовую стоимость доставки и проверяем min_order_amount зоны
            self.delivery_fee = base_delivery_fee
            for zone in delivery_zones:
                if zone.is_address_in_zone(self.address.latitude, self.address.longitude):
                    if zone.min_order_amount and self.calculate_total() >= zone.min_order_amount:
                        self.delivery_fee = 0
                    break
            self.discounted_total = self.calculate_total() + self.delivery_fee
            self.save()
            return
        
        order_total = self.calculate_total()
        discount_amount, new_delivery_fee = self.promotion.calculate_discount(order_total, base_delivery_fee)
        
        print(f"   - Скидка: {discount_amount}, Новая стоимость доставки: {new_delivery_fee}")
        
        # Увеличиваем счетчик использований акции
        if self.promotion:
            print(f"   - Увеличиваем счетчик использований акции '{self.promotion.name}' с {self.promotion.usage_count} до {self.promotion.usage_count + 1}")
            self.promotion.usage_count += 1
            self.promotion.save(update_fields=['usage_count'])
        
        # FREE_ITEM: добавить бесплатный OrderItem
        if self.promotion.discount_type == 'FREE_ITEM' and self.promotion.free_item:
            print(f"   - Применяем FREE_ITEM: {self.promotion.free_item.name}")
            from django.db import transaction
            with transaction.atomic():
                free_item_obj, created = OrderItem.objects.get_or_create(
                    order=self,
                    menu_item=self.promotion.free_item,
                    defaults={'quantity': 1}
                )
                if created:
                    free_item_obj.quantity = 1
                free_item_obj.save()
                free_item_obj.add_ons.clear()
        
        # FREE_ADDON: добавить бесплатный OrderItem с дополнением
        if self.promotion.discount_type == 'FREE_ITEM' and self.promotion.free_addon:
            print(f"   - Применяем FREE_ADDON: {self.promotion.free_addon.name}")
            from django.db import transaction
            with transaction.atomic():
                # Создаем OrderItem с бесплатным дополнением
                # Ищем подходящее блюдо для бесплатного дополнения
                menu_item_for_addon = None
                if self.promotion.free_addon.category:
                    menu_item_for_addon = self.promotion.free_addon.category.menuitem_set.first()
                
                # Если не нашли блюдо по категории, берем первое доступное
                if not menu_item_for_addon:
                    menu_item_for_addon = MenuItem.objects.first()
                
                if menu_item_for_addon:
                    free_addon_item = OrderItem.objects.create(
                        order=self,
                        menu_item=menu_item_for_addon,
                        quantity=1
                    )
                    free_addon_item.add_ons.add(self.promotion.free_addon)
        
        # Применяем итоговую стоимость доставки
        self.delivery_fee = new_delivery_fee
        
        # Проверяем min_order_amount зоны после применения акции
        # Сначала ищем зону, в которой находится адрес
        zone_for_min_order = None
        for zone in delivery_zones:
            if zone.is_address_in_zone(self.address.latitude, self.address.longitude):
                zone_for_min_order = zone
                break
        
        # Если адрес не в зоне, используем ближайшую зону
        if not zone_for_min_order and delivery_zones.exists():
            closest_zone = None
            min_distance = float('inf')
            
            for zone in delivery_zones:
                distance = zone.get_distance_to_zone(self.address.latitude, self.address.longitude)
                if distance and distance < min_distance:
                    min_distance = distance
                    closest_zone = zone
            
            zone_for_min_order = closest_zone
        
        # Применяем min_order_amount зоны
        if zone_for_min_order and zone_for_min_order.min_order_amount and self.calculate_total() >= zone_for_min_order.min_order_amount:
            self.delivery_fee = 0
            print(f"✅ Бесплатная доставка: сумма заказа {self.calculate_total()} >= {zone_for_min_order.min_order_amount}")
        
        self.discounted_total = order_total - discount_amount + self.delivery_fee
        if self.discounted_total < 0:
            self.discounted_total = 0
        self.save()
        
        print(f"   - Итоговая сумма: {self.discounted_total}, Стоимость доставки: {self.delivery_fee}")
    
    def get_best_available_promotion(self):
        """Возвращает лучшую доступную акцию по максимальной скидке"""
        from django.utils import timezone
        now = timezone.now()
        
        available_promotions = Promotion.objects.filter(
            is_active=True,
            valid_from__lte=now,
            valid_to__gte=now
        )
        
        best_promotion = None
        max_discount = 0
        
        # Рассчитываем базовую стоимость доставки для оценки FREE_DELIVERY акций (без учета min_order_amount зоны)
        base_delivery_fee = 0
        delivery_zones = DeliveryZone.objects.filter(
            city__iexact=self.address.city,
            is_active=True
        )
        
        # Сначала ищем зону, в которой находится адрес
        for zone in delivery_zones:
            if zone.is_address_in_zone(self.address.latitude, self.address.longitude):
                base_delivery_fee = zone.delivery_fee
                break
        
        # Если адрес не в зоне, используем стоимость доставки из ближайшей зоны
        if base_delivery_fee == 0 and delivery_zones.exists():
            closest_zone = None
            min_distance = float('inf')
            
            for zone in delivery_zones:
                distance = zone.get_distance_to_zone(self.address.latitude, self.address.longitude)
                if distance and distance < min_distance:
                    min_distance = distance
                    closest_zone = zone
            
            if closest_zone:
                base_delivery_fee = closest_zone.delivery_fee
        
        # Отладочная информация
        print(f"🔍 Отладка get_best_available_promotion:")
        print(f"   - Базовая стоимость доставки: {base_delivery_fee}")
        print(f"   - Сумма заказа: {self.calculate_total()}")
        print(f"   - Доступных акций: {available_promotions.count()}")
        
        for promotion in available_promotions:
            print(f"   - Проверяем акцию: '{promotion.name}' (тип: {promotion.discount_type})")
            
            if not promotion.is_valid():
                print(f"     ❌ Акция не валидна")
                continue
            
            order_total = self.calculate_total()
            if promotion.min_order_amount and order_total < promotion.min_order_amount:
                print(f"     ❌ Не подходит по сумме: {order_total} < {promotion.min_order_amount}")
                continue
            
            # Для FREE_DELIVERY и FREE_ITEM считаем потенциальную экономию
            if promotion.discount_type == 'FREE_DELIVERY':
                potential_savings = base_delivery_fee
                print(f"     ✅ FREE_DELIVERY: экономия {potential_savings}")
            elif promotion.discount_type == 'FREE_ITEM':
                if promotion.free_item:
                    potential_savings = promotion.free_item.price
                    print(f"     ✅ FREE_ITEM: экономия {potential_savings} (бесплатный товар)")
                elif promotion.free_addon:
                    potential_savings = promotion.free_addon.price
                    print(f"     ✅ FREE_ITEM: экономия {potential_savings} (бесплатное дополнение)")
                else:
                    potential_savings = 0
                    print(f"     ❌ FREE_ITEM: нет бесплатного товара")
            else:
                discount_amount, _ = promotion.calculate_discount(order_total, 0)
                potential_savings = discount_amount
                print(f"     ✅ {promotion.discount_type}: экономия {potential_savings}")
            
            if potential_savings > max_discount:
                max_discount = potential_savings
                best_promotion = promotion
                print(f"     🏆 Новая лучшая акция: '{promotion.name}' с экономией {potential_savings}")
            else:
                print(f"     ⚠️  Не лучшая акция (экономия {potential_savings} <= {max_discount})")
        
        if best_promotion:
            print(f"   - Выбрана акция: '{best_promotion.name}' с экономией {max_discount}")
        else:
            print(f"   - Подходящих акций не найдено")
        
        return best_promotion

class Favorite(models.Model):
    """Модель для избранных товаров пользователя"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='favorites')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Избранный товар"
        verbose_name_plural = "Избранные товары"
        unique_together = ('user', 'menu_item')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['menu_item']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.first_name} - {self.menu_item.name}"