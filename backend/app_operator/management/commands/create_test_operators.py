from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from app_operator.models import Operator
from api.models import DeliveryZone
from django.utils import timezone

User = get_user_model()

class Command(BaseCommand):
    help = 'Создает тестовых операторов для системы доставки'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Удалить существующих операторов перед созданием новых',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Удаление существующих операторов...')
            Operator.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Операторы удалены'))

        # Создаем зоны доставки для Бухары и Кагана
        bukhara_zones = [
            {
                'name': 'Центр Бухары',
                'city': 'Бухара',
                'center_latitude': 39.7681,
                'center_longitude': 64.4556,
                'radius_km': 3.0,
                'delivery_fee': 5000,
                'min_order_amount': 30000
            },
            {
                'name': 'Новая Бухара',
                'city': 'Бухара',
                'center_latitude': 39.7750,
                'center_longitude': 64.4300,
                'radius_km': 2.5,
                'delivery_fee': 4000,
                'min_order_amount': 25000
            }
        ]

        kagan_zones = [
            {
                'name': 'Центр Кагана',
                'city': 'Каган',
                'center_latitude': 39.7200,
                'center_longitude': 64.5500,
                'radius_km': 2.0,
                'delivery_fee': 3000,
                'min_order_amount': 20000
            }
        ]

        # Создаем зоны доставки
        zones = []
        for zone_data in bukhara_zones + kagan_zones:
            zone, created = DeliveryZone.objects.get_or_create(
                name=zone_data['name'],
                city=zone_data['city'],
                defaults=zone_data
            )
            zones.append(zone)
            if created:
                self.stdout.write(f'Создана зона: {zone.name} ({zone.city})')

        # Создаем операторов
        operators_data = [
            {
                'username': 'operator_bukhara_1',
                'password': 'operator123',
                'first_name': 'Али',
                'last_name': 'Алиев',
                'email': 'ali@streetburger.uz',
                'phone': '901234567',
                'telegram_id': 123456789,
                'rating': 4.8,
                'completed_orders_count': 150,
                'avg_delivery_time': 25,
                'zones': ['Центр Бухары']
            },
            {
                'username': 'operator_bukhara_2',
                'password': 'operator123',
                'first_name': 'Сергей',
                'last_name': 'Петров',
                'email': 'sergey@streetburger.uz',
                'phone': '901234568',
                'telegram_id': 123456790,
                'rating': 4.6,
                'completed_orders_count': 120,
                'avg_delivery_time': 28,
                'zones': ['Новая Бухара']
            },
            {
                'username': 'operator_kagan_1',
                'password': 'operator123',
                'first_name': 'Мария',
                'last_name': 'Иванова',
                'email': 'maria@streetburger.uz',
                'phone': '901234569',
                'telegram_id': 123456791,
                'rating': 4.9,
                'completed_orders_count': 200,
                'avg_delivery_time': 22,
                'zones': ['Центр Кагана']
            },
            {
                'username': 'operator_bukhara_3',
                'password': 'operator123',
                'first_name': 'Дмитрий',
                'last_name': 'Сидоров',
                'email': 'dmitry@streetburger.uz',
                'phone': '901234570',
                'telegram_id': 123456792,
                'rating': 4.7,
                'completed_orders_count': 180,
                'avg_delivery_time': 26,
                'zones': ['Центр Бухары', 'Новая Бухара']
            }
        ]

        created_operators = []
        for operator_data in operators_data:
            zones_names = operator_data.pop('zones')
            
            operator, created = Operator.objects.get_or_create(
                username=operator_data['username'],
                defaults=operator_data
            )
            
            if created:
                # Назначаем зоны оператору
                for zone_name in zones_names:
                    zone = DeliveryZone.objects.get(name=zone_name)
                    operator.assigned_zones.add(zone)
                
                created_operators.append(operator)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Создан оператор: {operator.first_name} {operator.last_name} '
                        f'({operator.username}) - зоны: {", ".join(zones_names)}'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Оператор {operator.username} уже существует'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'Создано {len(created_operators)} операторов'
            )
        )

        # Выводим информацию для входа
        self.stdout.write('\n' + '='*50)
        self.stdout.write('ДАННЫЕ ДЛЯ ВХОДА В СИСТЕМУ:')
        self.stdout.write('='*50)
        
        for operator in created_operators:
            self.stdout.write(
                f'Логин: {operator.username}\n'
                f'Пароль: operator123\n'
                f'Имя: {operator.first_name} {operator.last_name}\n'
                f'Телефон: {operator.phone}\n'
                f'Зоны: {", ".join([zone.name for zone in operator.assigned_zones.all()])}\n'
                f'---'
            )

        self.stdout.write(
            self.style.SUCCESS(
                '\nТестовые операторы успешно созданы!'
            )
        ) 