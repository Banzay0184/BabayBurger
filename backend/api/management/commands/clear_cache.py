from django.core.management.base import BaseCommand
from api.utils import clear_menu_cache, clear_categories_cache, clear_all_caches, get_cache_info
import logging

logger = logging.getLogger('api')

class Command(BaseCommand):
    help = 'Управление кэшем приложения'

    def add_arguments(self, parser):
        parser.add_argument(
            '--menu',
            action='store_true',
            help='Очистить кэш меню',
        )
        parser.add_argument(
            '--categories',
            action='store_true',
            help='Очистить кэш категорий',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Очистить все кэши',
        )
        parser.add_argument(
            '--info',
            action='store_true',
            help='Показать информацию о кэше',
        )

    def handle(self, *args, **options):
        if options['info']:
            cache_info = get_cache_info()
            redis_status = "✅ Доступен" if cache_info.get('redis_available', False) else "❌ Недоступен"
            self.stdout.write(
                self.style.SUCCESS(
                    f"Информация о кэше:\n"
                    f"  Redis: {redis_status}\n"
                    f"  Меню кэшировано: {cache_info.get('menu_cached', False)}\n"
                    f"  Категории кэшированы: {cache_info.get('categories_cached', False)}"
                )
            )
            return

        if options['menu']:
            clear_menu_cache()
            self.stdout.write(
                self.style.SUCCESS('Кэш меню очищен')
            )

        if options['categories']:
            clear_categories_cache()
            self.stdout.write(
                self.style.SUCCESS('Кэш категорий очищен')
            )

        if options['all']:
            clear_all_caches()
            self.stdout.write(
                self.style.SUCCESS('Все кэши очищены')
            )

        if not any([options['menu'], options['categories'], options['all'], options['info']]):
            self.stdout.write(
                self.style.WARNING(
                    'Используйте --help для просмотра доступных опций'
                )
            ) 