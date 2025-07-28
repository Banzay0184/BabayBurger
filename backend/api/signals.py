from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import MenuItem, Category
from .utils import clear_menu_cache, clear_categories_cache
import logging

logger = logging.getLogger('api')

@receiver(post_save, sender=MenuItem)
def clear_menu_cache_on_menu_item_change(sender, instance, **kwargs):
    """Очищает кэш меню при изменении элемента меню"""
    try:
        clear_menu_cache()
        logger.info(f"Menu cache cleared after MenuItem change: id={instance.id}")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}")

@receiver(post_delete, sender=MenuItem)
def clear_menu_cache_on_menu_item_delete(sender, instance, **kwargs):
    """Очищает кэш меню при удалении элемента меню"""
    try:
        clear_menu_cache()
        logger.info(f"Menu cache cleared after MenuItem deletion: id={instance.id}")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}")

@receiver(post_save, sender=Category)
def clear_categories_cache_on_category_change(sender, instance, **kwargs):
    """Очищает кэш категорий при изменении категории"""
    try:
        clear_categories_cache()
        logger.info(f"Categories cache cleared after Category change: id={instance.id}")
    except Exception as e:
        logger.error(f"Error clearing categories cache: {str(e)}")

@receiver(post_delete, sender=Category)
def clear_categories_cache_on_category_delete(sender, instance, **kwargs):
    """Очищает кэш категорий при удалении категории"""
    try:
        clear_categories_cache()
        logger.info(f"Categories cache cleared after Category deletion: id={instance.id}")
    except Exception as e:
        logger.error(f"Error clearing categories cache: {str(e)}") 