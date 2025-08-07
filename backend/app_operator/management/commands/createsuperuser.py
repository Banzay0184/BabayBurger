from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
import re

User = get_user_model()

class Command(BaseCommand):
    help = 'Создает суперпользователя с запросом номера телефона'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            help='Имя пользователя',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email адрес',
        )
        parser.add_argument(
            '--phone',
            type=str,
            help='Номер телефона',
        )
        parser.add_argument(
            '--noinput',
            action='store_true',
            help='Не запрашивать данные интерактивно',
        )

    def validate_phone(self, phone):
        """Валидация узбекского номера телефона"""
        if not phone:
            return True, None  # Пустой номер разрешен для суперпользователей
        
        cleaned = re.sub(r'[\s\-\(\)]', '', str(phone))
        
        if not cleaned.isdigit() and not cleaned.startswith('+998'):
            return False, 'Введите корректный узбекский номер телефона'
        
        if cleaned.startswith('+998'):
            cleaned = cleaned[4:]
        elif cleaned.startswith('998'):
            cleaned = cleaned[3:]
        
        if len(cleaned) != 9:
            return False, 'Номер должен содержать 9 цифр после кода страны'
        
        operator_code = cleaned[:2]
        valid_operators = ['90', '91', '93', '94', '95', '97', '98', '99', '88', '77']
        
        if operator_code not in valid_operators:
            return False, f'Неверный код оператора: {operator_code}'
        
        return True, None

    def handle(self, *args, **options):
        username = options.get('username')
        email = options.get('email')
        phone = options.get('phone')
        noinput = options.get('noinput')

        if not noinput:
            # Интерактивный режим
            if not username:
                username = input('Имя пользователя: ')
            
            if not email:
                email = input('Email адрес: ')
            
            if not phone:
                phone = input('Номер телефона (необязательно, формат: +998 90 123 45 67): ').strip()
                if phone:
                    while True:
                        is_valid, error = self.validate_phone(phone)
                        if is_valid:
                            break
                        self.stdout.write(self.style.ERROR(error))
                        phone = input('Номер телефона (необязательно, формат: +998 90 123 45 67): ').strip()
                        if not phone:
                            break
            
            password = input('Пароль: ')
            password_confirm = input('Пароль (повторно): ')
            
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Пароли не совпадают'))
                return
        else:
            # Неинтерактивный режим
            if not username or not phone:
                self.stdout.write(self.style.ERROR('--username и --phone обязательны в неинтерактивном режиме'))
                return
            
            password = input('Пароль: ')
            password_confirm = input('Пароль (повторно): ')
            
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Пароли не совпадают'))
                return

        # Проверяем, существует ли пользователь
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'Пользователь с именем {username} уже существует'))
            return
        
        if User.objects.filter(phone=phone).exists():
            self.stdout.write(self.style.ERROR(f'Пользователь с номером {phone} уже существует'))
            return

        try:
            with transaction.atomic():
                user = User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password,
                    phone=phone
                )
                self.stdout.write(
                    self.style.SUCCESS(f'Суперпользователь {username} успешно создан')
                )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Ошибка при создании пользователя: {e}')) 