from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import MenuItem, Category, AddOn, SizeOption
from .utils import clear_menu_cache, clear_categories_cache
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
import logging

logger = logging.getLogger('api')

# Отладочная информация о загрузке сигналов
print("🔥 API signals module loaded successfully!")
logger.info("🔥 API signals module loaded successfully!")

def send_menu_update_notification(menu_item, action):
    """Отправляет WebSocket уведомление об изменении меню"""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                'menu_updates',
                {
                    'type': 'menu_item_updated',
                    'item_id': menu_item.id,
                    'item_name': menu_item.name,
                    'is_active': menu_item.is_active,
                    'action': action,
                    'timestamp': timezone.now().isoformat()
                }
            )
            logger.info(f"📡 Menu update notification sent: {menu_item.name} - {action}")
    except Exception as e:
        logger.error(f"Error sending menu update notification: {str(e)}")

@receiver(post_save, sender=MenuItem)
def clear_menu_cache_on_menu_item_change(sender, instance, created, **kwargs):
    """Очищает кэш меню при изменении элемента меню и отправляет WebSocket уведомление"""
    try:
        clear_menu_cache()
        
        # Определяем действие
        action = 'created' if created else 'updated'
        
        # Отправляем WebSocket уведомление
        send_menu_update_notification(instance, action)
        
        logger.info(f"Menu cache cleared and WebSocket notification sent after MenuItem {action}: id={instance.id}")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}")

@receiver(post_delete, sender=MenuItem)
def clear_menu_cache_on_menu_item_delete(sender, instance, **kwargs):
    """Очищает кэш меню при удалении элемента меню и отправляет WebSocket уведомление"""
    try:
        clear_menu_cache()
        
        # Отправляем WebSocket уведомление о удалении
        send_menu_update_notification(instance, 'deleted')
        
        logger.info(f"Menu cache cleared and WebSocket notification sent after MenuItem deletion: id={instance.id}")
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

@receiver(post_save, sender=AddOn)
def clear_menu_cache_on_addon_change(sender, instance, created, **kwargs):
    """Очищает кэш меню при изменении дополнения и отправляет WebSocket уведомление"""
    print(f"🔥 AddOn signal triggered: {instance.name} - created={created}, active={instance.is_active}")
    logger.info(f"🔥 AddOn signal triggered: {instance.name} - created={created}, active={instance.is_active}")
    try:
        clear_menu_cache()
        
        # Определяем действие
        action = 'created' if created else 'updated'
        
        # Если дополнение было создано и у него есть категория, автоматически добавляем его к товарам этой категории
        if created and instance.category:
            try:
                # Получаем все товары этой категории
                menu_items = MenuItem.objects.filter(category=instance.category, is_active=True)
                for menu_item in menu_items:
                    # Добавляем дополнение к товару, если его там еще нет
                    if not menu_item.add_on_options.filter(id=instance.id).exists():
                        menu_item.add_on_options.add(instance)
                        logger.info(f"➕ Автоматически добавлено дополнение '{instance.name}' к товару '{menu_item.name}'")
                
                logger.info(f"✅ Дополнение '{instance.name}' автоматически добавлено к {menu_items.count()} товарам категории '{instance.category.name}'")
            except Exception as auto_add_error:
                logger.error(f"Error auto-adding addon to menu items: {str(auto_add_error)}")
        
        # Отправляем WebSocket уведомление о дополнении
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'menu_updates',
                    {
                        'type': 'addon_updated',
                        'addon_id': instance.id,
                        'addon_name': instance.name,
                        'is_active': instance.is_active,
                        'action': action,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                logger.info(f"📡 AddOn update notification sent: {instance.name} - {action}")
            else:
                logger.warning("Channel layer not available for AddOn notification")
        except Exception as ws_error:
            logger.error(f"Error sending AddOn WebSocket notification: {str(ws_error)}")
        
        # Если дополнение было создано, отправляем дополнительное уведомление о принудительном обновлении меню
        if created:
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        'menu_updates',
                        {
                            'type': 'menu_refresh_required',
                            'reason': 'new_addon_created',
                            'addon_name': instance.name,
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                    logger.info(f"📡 Menu refresh required notification sent: new addon {instance.name}")
                else:
                    logger.warning("Channel layer not available for menu refresh notification")
            except Exception as ws_error:
                logger.error(f"Error sending menu refresh notification: {str(ws_error)}")
        
        logger.info(f"Menu cache cleared after AddOn {action}: id={instance.id}, name={instance.name}")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}")

@receiver(post_delete, sender=AddOn)
def clear_menu_cache_on_addon_delete(sender, instance, **kwargs):
    """Очищает кэш меню при удалении дополнения и отправляет WebSocket уведомление"""
    try:
        clear_menu_cache()
        
        # Отправляем WebSocket уведомление об удалении дополнения
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'menu_updates',
                    {
                        'type': 'addon_updated',
                        'addon_id': instance.id,
                        'addon_name': instance.name,
                        'is_active': False,
                        'action': 'deleted',
                        'timestamp': timezone.now().isoformat()
                    }
                )
                logger.info(f"📡 AddOn deletion notification sent: {instance.name}")
        except Exception as ws_error:
            logger.error(f"Error sending AddOn WebSocket notification: {str(ws_error)}")
        
        logger.info(f"Menu cache cleared after AddOn deletion: id={instance.id}, name={instance.name}")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}")

@receiver(post_save, sender=SizeOption)
def clear_menu_cache_on_size_change(sender, instance, created, **kwargs):
    """Очищает кэш меню при изменении размера и отправляет WebSocket уведомление"""
    try:
        clear_menu_cache()
        
        # Определяем действие
        action = 'created' if created else 'updated'
        
        # Отправляем WebSocket уведомление о размере
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'menu_updates',
                    {
                        'type': 'size_updated',
                        'size_id': instance.id,
                        'size_name': instance.name,
                        'is_active': instance.is_active,
                        'action': action,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                logger.info(f"📡 SizeOption update notification sent: {instance.name} - {action}")
        except Exception as ws_error:
            logger.error(f"Error sending SizeOption WebSocket notification: {str(ws_error)}")
        
        # Если размер был создан, отправляем дополнительное уведомление о принудительном обновлении меню
        if created:
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        'menu_updates',
                        {
                            'type': 'menu_refresh_required',
                            'reason': 'new_size_created',
                            'size_name': instance.name,
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                    logger.info(f"📡 Menu refresh required notification sent: new size {instance.name}")
            except Exception as ws_error:
                logger.error(f"Error sending menu refresh notification: {str(ws_error)}")
        
        logger.info(f"Menu cache cleared after SizeOption {action}: id={instance.id}, name={instance.name}")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}")

@receiver(post_delete, sender=SizeOption)
def clear_menu_cache_on_size_delete(sender, instance, **kwargs):
    """Очищает кэш меню при удалении размера и отправляет WebSocket уведомление"""
    try:
        clear_menu_cache()
        
        # Отправляем WebSocket уведомление об удалении размера
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    'menu_updates',
                    {
                        'type': 'size_updated',
                        'size_id': instance.id,
                        'size_name': instance.name,
                        'is_active': False,
                        'action': 'deleted',
                        'timestamp': timezone.now().isoformat()
                    }
                )
                logger.info(f"📡 SizeOption deletion notification sent: {instance.name}")
        except Exception as ws_error:
            logger.error(f"Error sending SizeOption WebSocket notification: {str(ws_error)}")
        
        logger.info(f"Menu cache cleared after SizeOption deletion: id={instance.id}, name={instance.name}")
    except Exception as e:
        logger.error(f"Error clearing menu cache: {str(e)}") 