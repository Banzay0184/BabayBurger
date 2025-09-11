from django.db.models.signals import post_save, post_delete, m2m_changed
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
        
        # Если дополнение было создано, автоматически добавляем его к товарам соответствующих категорий
        if created:
            try:
                # Получаем категории, для которых доступно это дополнение
                target_categories = []
                
                # Если указана основная категория дополнения
                if instance.category:
                    target_categories.append(instance.category)
                
                # Добавляем категории из available_for_categories
                if instance.available_for_categories.exists():
                    target_categories.extend(instance.available_for_categories.all())
                
                # Убираем дубликаты
                target_categories = list(set(target_categories))
                
                if target_categories:
                    # Получаем все товары из целевых категорий
                    menu_items = MenuItem.objects.filter(
                        category__in=target_categories, 
                        is_active=True
                    )
                    
                    added_count = 0
                    for menu_item in menu_items:
                        # Добавляем дополнение к товару, если его там еще нет
                        if not menu_item.add_on_options.filter(id=instance.id).exists():
                            menu_item.add_on_options.add(instance)
                            added_count += 1
                            logger.info(f"➕ Автоматически добавлено дополнение '{instance.name}' к товару '{menu_item.name}' (категория: {menu_item.category.name})")
                    
                    category_names = [cat.name for cat in target_categories]
                    logger.info(f"✅ Дополнение '{instance.name}' автоматически добавлено к {added_count} товарам категорий: {', '.join(category_names)}")
                else:
                    logger.info(f"ℹ️ Дополнение '{instance.name}' не привязано ни к одной категории")
                    
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

@receiver(m2m_changed, sender=MenuItem.add_on_options.through)
def menu_item_addons_changed(sender, instance, action, pk_set, **kwargs):
    """Отслеживает изменения в дополнениях товара и отправляет WebSocket уведомления"""
    print(f"🔥 MenuItem addons changed: {instance.name} - action={action}, pk_set={pk_set}")
    logger.info(f"🔥 MenuItem addons changed: {instance.name} - action={action}, pk_set={pk_set}")
    
    try:
        # Очищаем кэш меню
        clear_menu_cache()
        
        # Отправляем WebSocket уведомление об обновлении товара
        send_menu_update_notification(instance, 'updated')
        
        # Если есть конкретные дополнения, отправляем уведомления о них
        if pk_set and action in ['post_add', 'post_remove', 'post_clear']:
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Получаем информацию о дополнениях
                    if action == 'post_remove' and pk_set:
                        # Дополнения были удалены
                        for addon_id in pk_set:
                            try:
                                addon = AddOn.objects.get(id=addon_id)
                                async_to_sync(channel_layer.group_send)(
                                    'menu_updates',
                                    {
                                        'type': 'addon_updated',
                                        'addon_id': addon.id,
                                        'addon_name': addon.name,
                                        'is_active': addon.is_active,
                                        'action': 'removed_from_item',
                                        'item_name': instance.name,
                                        'timestamp': timezone.now().isoformat()
                                    }
                                )
                                logger.info(f"📡 AddOn removal notification sent: {addon.name} removed from {instance.name}")
                            except AddOn.DoesNotExist:
                                pass
                    elif action == 'post_add' and pk_set:
                        # Дополнения были добавлены
                        for addon_id in pk_set:
                            try:
                                addon = AddOn.objects.get(id=addon_id)
                                async_to_sync(channel_layer.group_send)(
                                    'menu_updates',
                                    {
                                        'type': 'addon_updated',
                                        'addon_id': addon.id,
                                        'addon_name': addon.name,
                                        'is_active': addon.is_active,
                                        'action': 'added_to_item',
                                        'item_name': instance.name,
                                        'timestamp': timezone.now().isoformat()
                                    }
                                )
                                logger.info(f"📡 AddOn addition notification sent: {addon.name} added to {instance.name}")
                            except AddOn.DoesNotExist:
                                pass
            except Exception as ws_error:
                logger.error(f"Error sending AddOn change WebSocket notification: {str(ws_error)}")
        
        logger.info(f"Menu cache cleared after MenuItem addons change: {instance.name} - {action}")
    except Exception as e:
        logger.error(f"Error handling MenuItem addons change: {str(e)}")

@receiver(m2m_changed, sender=MenuItem.size_options.through)
def menu_item_sizes_changed(sender, instance, action, pk_set, **kwargs):
    """Отслеживает изменения в размерах товара и отправляет WebSocket уведомления"""
    print(f"🔥 MenuItem sizes changed: {instance.name} - action={action}, pk_set={pk_set}")
    logger.info(f"🔥 MenuItem sizes changed: {instance.name} - action={action}, pk_set={pk_set}")
    
    try:
        # Очищаем кэш меню
        clear_menu_cache()
        
        # Отправляем WebSocket уведомление об обновлении товара
        send_menu_update_notification(instance, 'updated')
        
        # Если есть конкретные размеры, отправляем уведомления о них
        if pk_set and action in ['post_add', 'post_remove', 'post_clear']:
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Получаем информацию о размерах
                    if action == 'post_remove' and pk_set:
                        # Размеры были удалены
                        for size_id in pk_set:
                            try:
                                size = SizeOption.objects.get(id=size_id)
                                async_to_sync(channel_layer.group_send)(
                                    'menu_updates',
                                    {
                                        'type': 'size_updated',
                                        'size_id': size.id,
                                        'size_name': size.name,
                                        'is_active': size.is_active,
                                        'action': 'removed_from_item',
                                        'item_name': instance.name,
                                        'timestamp': timezone.now().isoformat()
                                    }
                                )
                                logger.info(f"📡 SizeOption removal notification sent: {size.name} removed from {instance.name}")
                            except SizeOption.DoesNotExist:
                                pass
                    elif action == 'post_add' and pk_set:
                        # Размеры были добавлены
                        for size_id in pk_set:
                            try:
                                size = SizeOption.objects.get(id=size_id)
                                async_to_sync(channel_layer.group_send)(
                                    'menu_updates',
                                    {
                                        'type': 'size_updated',
                                        'size_id': size.id,
                                        'size_name': size.name,
                                        'is_active': size.is_active,
                                        'action': 'added_to_item',
                                        'item_name': instance.name,
                                        'timestamp': timezone.now().isoformat()
                                    }
                                )
                                logger.info(f"📡 SizeOption addition notification sent: {size.name} added to {instance.name}")
                            except SizeOption.DoesNotExist:
                                pass
            except Exception as ws_error:
                logger.error(f"Error sending SizeOption change WebSocket notification: {str(ws_error)}")
        
        logger.info(f"Menu cache cleared after MenuItem sizes change: {instance.name} - {action}")
    except Exception as e:
        logger.error(f"Error handling MenuItem sizes change: {str(e)}")

@receiver(m2m_changed, sender=AddOn.available_for_categories.through)
def handle_addon_categories_changed(sender, instance, action, pk_set, **kwargs):
    """Обрабатывает изменения в поле available_for_categories дополнения"""
    logger.info(f"🔄 AddOn categories changed: {instance.name} - action: {action}")
    
    try:
        clear_menu_cache()
        
        if action == 'post_add' and pk_set:
            # Категории были добавлены к дополнению
            try:
                # Получаем добавленные категории
                added_categories = Category.objects.filter(id__in=pk_set)
                
                # Добавляем дополнение ко всем товарам этих категорий
                for category in added_categories:
                    menu_items = MenuItem.objects.filter(category=category, is_active=True)
                    added_count = 0
                    
                    for menu_item in menu_items:
                        if not menu_item.add_on_options.filter(id=instance.id).exists():
                            menu_item.add_on_options.add(instance)
                            added_count += 1
                            logger.info(f"➕ Добавлено дополнение '{instance.name}' к товару '{menu_item.name}' (категория: {category.name})")
                    
                    logger.info(f"✅ Дополнение '{instance.name}' добавлено к {added_count} товарам категории '{category.name}'")
                    
            except Exception as e:
                logger.error(f"Error adding addon to new categories: {str(e)}")
        
        elif action == 'post_remove' and pk_set:
            # Категории были удалены из дополнения
            try:
                # Получаем удаленные категории
                removed_categories = Category.objects.filter(id__in=pk_set)
                
                # Удаляем дополнение из всех товаров этих категорий
                for category in removed_categories:
                    menu_items = MenuItem.objects.filter(category=category, is_active=True)
                    removed_count = 0
                    
                    for menu_item in menu_items:
                        if menu_item.add_on_options.filter(id=instance.id).exists():
                            menu_item.add_on_options.remove(instance)
                            removed_count += 1
                            logger.info(f"➖ Удалено дополнение '{instance.name}' из товара '{menu_item.name}' (категория: {category.name})")
                    
                    logger.info(f"✅ Дополнение '{instance.name}' удалено из {removed_count} товаров категории '{category.name}'")
                    
            except Exception as e:
                logger.error(f"Error removing addon from categories: {str(e)}")
        
        # Отправляем WebSocket уведомление
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
                        'action': 'categories_changed',
                        'timestamp': timezone.now().isoformat()
                    }
                )
                logger.info(f"📡 AddOn categories change notification sent: {instance.name}")
        except Exception as e:
            logger.error(f"Error sending WebSocket notification for addon categories change: {str(e)}")
            
    except Exception as e:
        logger.error(f"Error handling addon categories change: {str(e)}") 