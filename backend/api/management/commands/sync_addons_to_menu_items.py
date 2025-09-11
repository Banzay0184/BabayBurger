from django.core.management.base import BaseCommand
from api.models import AddOn, MenuItem, Category
from django.db import transaction

class Command(BaseCommand):
    help = 'Синхронизирует дополнения с товарами меню на основе их категорий'

    def add_arguments(self, parser):
        parser.add_argument(
            '--addon-id',
            type=int,
            help='ID конкретного дополнения для синхронизации'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Показать что будет сделано без фактического выполнения'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        addon_id = options.get('addon_id')
        
        if addon_id:
            addons = AddOn.objects.filter(id=addon_id)
            if not addons.exists():
                self.stdout.write(
                    self.style.ERROR(f'Дополнение с ID {addon_id} не найдено')
                )
                return
        else:
            addons = AddOn.objects.filter(is_active=True)
        
        total_added = 0
        total_removed = 0
        
        with transaction.atomic():
            for addon in addons:
                self.stdout.write(f'\n🔄 Обрабатываем дополнение: {addon.name}')
                
                # Получаем целевые категории
                target_categories = []
                
                if addon.available_for_categories.exists():
                    target_categories.extend(addon.available_for_categories.all())
                
                # Убираем дубликаты
                target_categories = list(set(target_categories))
                
                if not target_categories:
                    self.stdout.write(
                        self.style.WARNING(f'  ⚠️  Дополнение "{addon.name}" не привязано ни к одной категории')
                    )
                    continue
                
                # Получаем все товары из целевых категорий
                menu_items = MenuItem.objects.filter(
                    category__in=target_categories,
                    is_active=True
                )
                
                added_count = 0
                removed_count = 0
                
                for menu_item in menu_items:
                    # Проверяем, должно ли это дополнение быть у товара
                    should_have_addon = (
                        menu_item.category in addon.available_for_categories.all()
                    )
                    
                    has_addon = menu_item.add_on_options.filter(id=addon.id).exists()
                    
                    if should_have_addon and not has_addon:
                        if not dry_run:
                            menu_item.add_on_options.add(addon)
                        added_count += 1
                        self.stdout.write(
                            f'  ➕ Добавлено к товару "{menu_item.name}" (категория: {menu_item.category.name})'
                        )
                    elif not should_have_addon and has_addon:
                        if not dry_run:
                            menu_item.add_on_options.remove(addon)
                        removed_count += 1
                        self.stdout.write(
                            f'  ➖ Удалено из товара "{menu_item.name}" (категория: {menu_item.category.name})'
                        )
                
                category_names = [cat.name for cat in target_categories]
                self.stdout.write(
                    f'  ✅ Обработано {menu_items.count()} товаров категорий: {", ".join(category_names)}'
                )
                self.stdout.write(
                    f'  📊 Добавлено: {added_count}, Удалено: {removed_count}'
                )
                
                total_added += added_count
                total_removed += removed_count
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'\n🔍 DRY RUN: Будет добавлено {total_added} и удалено {total_removed} связей')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\n✅ Синхронизация завершена: добавлено {total_added} и удалено {total_removed} связей')
            )
