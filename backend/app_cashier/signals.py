from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from .models import Cashier, OrderProcessing, CashierNotification
from api.models import Order
from .serializers import OrderForCashierSerializer

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Order)
def notify_cashiers_order_update(sender, instance, created, **kwargs):
    """
    Уведомляет кассиров об обновлении заказа через WebSocket
    """
    logger.info(f"🔔 Cashier Signal triggered: Order #{instance.id}, created={created}, status={instance.status}")
    
    if created and instance.status == 'pending':
        logger.info(f"🆕 Processing new order #{instance.id} for cashiers")
        
        # Отправляем WebSocket уведомление кассирам
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                # Загружаем заказ с полными данными для сериализации
                order_with_details = Order.objects.select_related(
                    'user', 'address', 'restaurant'
                ).prefetch_related(
                    'orderitem_set__menu_item',
                    'orderitem_set__size_option',
                    'orderitem_set__add_ons'
                ).get(id=instance.id)
                
                # Сериализуем заказ для WebSocket
                order_data = OrderForCashierSerializer(order_with_details).data
                
                # Отправляем всем кассирам
                async_to_sync(channel_layer.group_send)(
                    'cashiers',
                    {
                        'type': 'order_created',
                        'order': order_data,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                
                # Отправляем конкретному кассиру, если заказ назначен на ресторан
                if instance.restaurant:
                    # Находим кассиров этого ресторана
                    restaurant_cashiers = Cashier.objects.filter(
                        restaurant=instance.restaurant,
                        is_active_cashier=True
                    )
                    
                    for cashier in restaurant_cashiers:
                        async_to_sync(channel_layer.group_send)(
                            f'cashier_{cashier.id}',
                            {
                                'type': 'order_created',
                                'order': order_data,
                                'timestamp': timezone.now().isoformat()
                            }
                        )
                
                logger.info(f"WebSocket уведомление о новом заказе #{instance.id} отправлено кассирам")
        except Exception as e:
            logger.error(f"Ошибка отправки WebSocket уведомления кассирам: {e}")
    
    elif not created:
        # Обновление существующего заказа
        logger.info(f"🔄 Order #{instance.id} updated, status: {instance.status}")
        
        # Проверяем, есть ли OrderProcessing для этого заказа
        has_processing = OrderProcessing.objects.filter(order=instance).exists()
        
        # Если заказ перешел в статус 'preparing' и есть OrderProcessing, отправляем уведомление
        if instance.status == 'preparing' and has_processing:
            logger.info(f"🍳 Order #{instance.id} is now preparing, notifying cashiers")
            
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Быстрое уведомление без полной сериализации
                    message_data = {
                        'type': 'order_status_changed',
                        'order_id': instance.id,
                        'status': instance.status,
                        'timestamp': timezone.now().isoformat()
                    }
                    logger.info(f"📤 Fast WebSocket message to 'cashiers' group: {message_data}")
                    async_to_sync(channel_layer.group_send)('cashiers', message_data)
                    
                    # Отправляем конкретному кассиру, если заказ назначен на ресторан
                    if instance.restaurant:
                        restaurant_cashiers = Cashier.objects.filter(
                            restaurant=instance.restaurant,
                            is_active_cashier=True
                        )
                        
                        for cashier in restaurant_cashiers:
                            async_to_sync(channel_layer.group_send)(f'cashier_{cashier.id}', message_data)
                    
                    logger.info(f"Fast WebSocket уведомление о заказе для приготовления #{instance.id} отправлено кассирам")
            except Exception as e:
                logger.error(f"Ошибка отправки WebSocket уведомления кассирам: {e}")
        
        # Если заказ перешел в статус 'ready_for_delivery' и есть OrderProcessing, отправляем уведомление
        elif instance.status == 'ready_for_delivery' and has_processing:
            logger.info(f"✅ Order #{instance.id} is now ready for delivery, notifying cashiers")
            
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Быстрое уведомление без полной сериализации
                    message_data = {
                        'type': 'order_status_changed',
                        'order_id': instance.id,
                        'status': instance.status,
                        'timestamp': timezone.now().isoformat()
                    }
                    logger.info(f"📤 Fast WebSocket message to 'cashiers' group: {message_data}")
                    async_to_sync(channel_layer.group_send)('cashiers', message_data)
                    
                    # Отправляем конкретному кассиру, если заказ назначен на ресторан
                    if instance.restaurant:
                        restaurant_cashiers = Cashier.objects.filter(
                            restaurant=instance.restaurant,
                            is_active_cashier=True
                        )
                        
                        for cashier in restaurant_cashiers:
                            async_to_sync(channel_layer.group_send)(f'cashier_{cashier.id}', message_data)
                    
                    logger.info(f"Fast WebSocket уведомление о готовом заказе #{instance.id} отправлено кассирам")
            except Exception as e:
                logger.error(f"Ошибка отправки WebSocket уведомления о готовом заказе: {e}")
        
        # Для других обновлений статуса
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                # Быстрое уведомление без полной сериализации
                message_data = {
                    'type': 'order_status_changed',
                    'order_id': instance.id,
                    'status': instance.status,
                    'timestamp': timezone.now().isoformat()
                }
                logger.info(f"📤 Fast WebSocket message to 'cashiers' group for status update: {message_data}")
                async_to_sync(channel_layer.group_send)('cashiers', message_data)
                
                # Отправляем конкретному кассиру, если заказ назначен на ресторан
                if instance.restaurant:
                    restaurant_cashiers = Cashier.objects.filter(
                        restaurant=instance.restaurant,
                        is_active_cashier=True
                    )
                    
                    for cashier in restaurant_cashiers:
                        async_to_sync(channel_layer.group_send)(f'cashier_{cashier.id}', message_data)
                
                logger.info(f"Fast WebSocket уведомление об обновлении заказа #{instance.id} отправлено кассирам")
        except Exception as e:
            logger.error(f"Ошибка отправки WebSocket уведомления об обновлении заказа: {e}")

@receiver(post_save, sender=OrderProcessing)
def notify_cashiers_processing_update(sender, instance, created, **kwargs):
    """
    Уведомляет кассиров об обновлении обработки заказа
    """
    logger.info(f"🔔 OrderProcessing Signal triggered: Order #{instance.order.id}, status={instance.status}")
    
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            # Отправляем обновление статуса обработки
            async_to_sync(channel_layer.group_send)(
                f'cashier_{instance.cashier.id}',
                {
                    'type': 'order_status_changed',
                    'order_id': instance.order.id,
                    'status': instance.order.status,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            logger.info(f"WebSocket уведомление об обновлении обработки заказа #{instance.order.id} отправлено кассиру {instance.cashier.id}")
    except Exception as e:
        logger.error(f"Ошибка отправки WebSocket уведомления об обновлении обработки: {e}")

@receiver(post_save, sender=CashierNotification)
def notify_cashier_notification(sender, instance, created, **kwargs):
    """
    Отправляет уведомление кассиру через WebSocket
    """
    if created:
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                from .serializers import CashierNotificationSerializer
                notification_data = CashierNotificationSerializer(instance).data
                
                async_to_sync(channel_layer.group_send)(
                    f'cashier_{instance.cashier.id}',
                    {
                        'type': 'notification',
                        'notification': notification_data,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                
                logger.info(f"WebSocket уведомление отправлено кассиру {instance.cashier.id}")
        except Exception as e:
            logger.error(f"Ошибка отправки WebSocket уведомления кассиру: {e}")

