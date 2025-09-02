from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

from .models import (
    Operator, OperatorSession, OrderAssignment, OrderStatusHistory, 
    OperatorNotification, OperatorAnalytics
)
from api.models import Order
from .serializers import OrderForOperatorSerializer
from api.tasks import send_order_status_notification

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Order)
def notify_operators_new_order(sender, instance, created, **kwargs):
    """
    Уведомляет операторов о новом заказе через WebSocket и уведомления
    """
    logger.info(f"🔔 Signal triggered: Order #{instance.id}, created={created}, status={instance.status}")
    
    if created and instance.status == 'pending':
        logger.info(f"🆕 Processing new order #{instance.id} with status 'pending'")
        # Находим операторов, которые могут обработать заказ
        available_operators = Operator.objects.filter(
            is_active_operator=True,
            assigned_zones__is_active=True
        ).distinct()
        
        # Фильтруем операторов по зонам доставки
        order_address = instance.address
        suitable_operators = []
        
        for operator in available_operators:
            can_handle, message = operator.can_handle_order(instance)
            if can_handle:
                suitable_operators.append(operator)
        
        # Отправляем WebSocket уведомление всем операторам
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                # Сериализуем заказ для WebSocket
                order_data = OrderForOperatorSerializer(instance).data
                
                # Отправляем всем операторам
                logger.info(f"📡 Sending WebSocket notification to 'operators' group for order #{instance.id}")
                async_to_sync(channel_layer.group_send)(
                    'operators',
                    {
                        'type': 'order_created',
                        'order': order_data,
                        'timestamp': timezone.now().isoformat()
                    }
                )
                
                # Отправляем конкретным операторам
                for operator in suitable_operators:
                    async_to_sync(channel_layer.group_send)(
                        f'operator_{operator.id}',
                        {
                            'type': 'order_created',
                            'order': order_data,
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                
                logger.info(f"WebSocket уведомление о новом заказе #{instance.id} отправлено")
        except Exception as e:
            logger.error(f"Ошибка отправки WebSocket уведомления: {e}")
        
        # Мгновенная отправка уведомления о новом заказе в Telegram клиенту
        try:
            if instance.user and instance.user.telegram_id:
                from api.bot import send_notification
                message = f"🍔 Ваш заказ #{instance.id} принят!\n💰 Сумма: {instance.total_price} UZS\n📍 Адрес: {instance.address}\n⏰ Время: {instance.created_at.strftime('%H:%M')}"
                send_notification(instance.user.telegram_id, message)
                logger.info(f"Telegram уведомление о новом заказе #{instance.id} отправлено клиенту {instance.user.telegram_id}")
        except Exception as telegram_error:
            logger.error(f"Ошибка отправки Telegram уведомления о новом заказе: {telegram_error}")
        
        # Создаем уведомления для подходящих операторов
        for operator in suitable_operators:
            try:
                notification = OperatorNotification.objects.create(
                    operator=operator,
                    notification_type='new_order',
                    title='Новый заказ',
                    message=f'Поступил новый заказ #{instance.id} на сумму {instance.total_price} UZS',
                    order=instance
                )
                
                # Отправляем уведомление через WebSocket
                try:
                    if channel_layer:
                        from .serializers import OperatorNotificationSerializer
                        notification_data = OperatorNotificationSerializer(notification).data
                        async_to_sync(channel_layer.group_send)(
                            f'operator_{operator.id}',
                            {
                                'type': 'notification',
                                'notification': notification_data,
                                'timestamp': timezone.now().isoformat()
                            }
                        )
                except Exception as ws_error:
                    logger.error(f"Ошибка отправки WebSocket уведомления: {ws_error}")
                
                logger.info(f"Уведомление о новом заказе #{instance.id} отправлено оператору {operator.username}")
            except Exception as e:
                logger.error(f"Ошибка при создании уведомления для оператора {operator.username}: {e}")

@receiver(post_save, sender=OrderAssignment)
def notify_order_assignment(sender, instance, created, **kwargs):
    """
    Уведомляет оператора о назначении заказа через WebSocket и уведомления
    """
    if created:
        try:
            notification = OperatorNotification.objects.create(
                operator=instance.operator,
                notification_type='new_order',
                title='Заказ назначен',
                message=f'Вам назначен заказ #{instance.order.id}',
                order=instance.order
            )
            
            # Отправляем WebSocket уведомление о назначении заказа
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Отправляем всем операторам о назначении заказа
                    async_to_sync(channel_layer.group_send)(
                        'operators',
                        {
                            'type': 'order_assigned',
                            'order_id': instance.order.id,
                            'operator_id': instance.operator.id,
                            'operator_name': f"{instance.operator.first_name} {instance.operator.last_name}".strip(),
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                    
                    # Отправляем конкретному оператору уведомление
                    from .serializers import OperatorNotificationSerializer
                    notification_data = OperatorNotificationSerializer(notification).data
                    async_to_sync(channel_layer.group_send)(
                        f'operator_{instance.operator.id}',
                        {
                            'type': 'notification',
                            'notification': notification_data,
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                    
                    logger.info(f"WebSocket уведомление о назначении заказа #{instance.order.id} отправлено")
            except Exception as ws_error:
                logger.error(f"Ошибка отправки WebSocket уведомления: {ws_error}")
            
            logger.info(f"Уведомление о назначении заказа #{instance.order.id} отправлено оператору {instance.operator.username}")
        except Exception as e:
            logger.error(f"Ошибка при создании уведомления о назначении: {e}")

@receiver(post_save, sender=OrderStatusHistory)
def notify_status_change(sender, instance, created, **kwargs):
    """
    Уведомляет операторов об изменении статуса заказа через WebSocket и уведомления
    """
    if created:
        # Уведомляем оператора, который изменил статус
        try:
            status_display = dict(Order.STATUS_CHOICES).get(instance.new_status, instance.new_status)
            notification = OperatorNotification.objects.create(
                operator=instance.operator,
                notification_type='order_status_change',
                title='Статус заказа изменен',
                message=f'Статус заказа #{instance.order.id} изменен на "{status_display}"',
                order=instance.order
            )
            
            # Отправляем WebSocket уведомление об обновлении заказа
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    # Сериализуем заказ для WebSocket
                    order_data = OrderForOperatorSerializer(instance.order).data
                    
                    # Отправляем всем операторам об обновлении заказа
                    async_to_sync(channel_layer.group_send)(
                        'operators',
                        {
                            'type': 'order_updated',
                            'order_id': instance.order.id,
                            'order': order_data,
                            'status': instance.new_status,
                            'updated_at': instance.order.updated_at.isoformat(),
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                    
                    # Отправляем конкретному оператору уведомление
                    from .serializers import OperatorNotificationSerializer
                    notification_data = OperatorNotificationSerializer(notification).data
                    async_to_sync(channel_layer.group_send)(
                        f'operator_{instance.operator.id}',
                        {
                            'type': 'notification',
                            'notification': notification_data,
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                    
                    # Отправляем в группу конкретного заказа
                    async_to_sync(channel_layer.group_send)(
                        f'order_{instance.order.id}',
                        {
                            'type': 'order_status_update',
                            'order_id': instance.order.id,
                            'status': instance.new_status,
                            'status_display': status_display,
                            'updated_at': instance.order.updated_at.isoformat(),
                            'timestamp': timezone.now().isoformat()
                        }
                    )
                    
                    # Отправляем в группу клиента (если есть telegram_id)
                    if instance.order.user and instance.order.user.telegram_id:
                        async_to_sync(channel_layer.group_send)(
                            f'client_{instance.order.user.telegram_id}',
                            {
                                'type': 'order_status_update',
                                'order_id': instance.order.id,
                                'status': instance.new_status,
                                'status_display': status_display,
                                'updated_at': instance.order.updated_at.isoformat(),
                                'timestamp': timezone.now().isoformat()
                            }
                        )
                    
                    logger.info(f"WebSocket уведомление об обновлении заказа #{instance.order.id} отправлено")
            except Exception as ws_error:
                logger.error(f"Ошибка отправки WebSocket уведомления: {ws_error}")
            
            # Мгновенная отправка уведомления в Telegram клиенту
            try:
                if instance.order.user and instance.order.user.telegram_id:
                    send_order_status_notification.delay(
                        chat_id=instance.order.user.telegram_id,
                        order_id=instance.order.id,
                        old_status=instance.old_status,
                        new_status=instance.new_status
                    )
                    logger.info(f"Telegram уведомление о статусе заказа #{instance.order.id} отправлено клиенту {instance.order.user.telegram_id}")
            except Exception as telegram_error:
                logger.error(f"Ошибка отправки Telegram уведомления: {telegram_error}")
            
            logger.info(f"Уведомление об изменении статуса заказа #{instance.order.id} отправлено оператору {instance.operator.username}")
        except Exception as e:
            logger.error(f"Ошибка при создании уведомления об изменении статуса: {e}")

@receiver(post_save, sender=Order)
def update_operator_analytics(sender, instance, **kwargs):
    """
    Обновляет аналитику оператора при изменении статуса заказа
    """
    if instance.status == 'completed':
        try:
            # Находим назначение заказа
            assignment = OrderAssignment.objects.filter(
                order=instance,
                status='completed'
            ).first()
            
            if assignment:
                operator = assignment.operator
                
                # Обновляем статистику оператора
                operator.completed_orders_count += 1
                
                # Вычисляем среднее время доставки
                if assignment.accepted_at:
                    delivery_time = (instance.updated_at - assignment.accepted_at).total_seconds() / 60
                    if operator.avg_delivery_time > 0:
                        operator.avg_delivery_time = (
                            (operator.avg_delivery_time * (operator.completed_orders_count - 1) + delivery_time) /
                            operator.completed_orders_count
                        )
                    else:
                        operator.avg_delivery_time = delivery_time
                
                operator.save()
                
                # Обновляем дневную аналитику
                today = timezone.now().date()
                OperatorAnalytics.update_daily_analytics(operator, today)
                
                logger.info(f"Аналитика оператора {operator.username} обновлена после завершения заказа #{instance.id}")
        except Exception as e:
            logger.error(f"Ошибка при обновлении аналитики оператора: {e}")

@receiver(post_save, sender=OperatorSession)
def update_session_statistics(sender, instance, **kwargs):
    """
    Обновляет статистику сессии при изменении
    """
    if instance.status == 'completed':
        try:
            # Подсчитываем количество обработанных заказов за сессию
            assignments = OrderAssignment.objects.filter(
                operator=instance.operator,
                assigned_at__range=(instance.start_time, instance.end_time or timezone.now())
            )
            
            instance.orders_handled = assignments.count()
            
            # Подсчитываем общее время доставки
            total_time = 0
            for assignment in assignments.filter(status='completed'):
                if assignment.accepted_at and assignment.order.status == 'completed':
                    delivery_time = (assignment.order.updated_at - assignment.accepted_at).total_seconds() / 60
                    total_time += delivery_time
            
            instance.total_delivery_time = int(total_time)
            instance.save()
            
            logger.info(f"Статистика сессии {instance.id} обновлена")
        except Exception as e:
            logger.error(f"Ошибка при обновлении статистики сессии: {e}")

@receiver(post_delete, sender=OrderAssignment)
def cleanup_notifications(sender, instance, **kwargs):
    """
    Очищает уведомления при удалении назначения заказа
    """
    try:
        # Удаляем уведомления, связанные с этим назначением
        OperatorNotification.objects.filter(
            operator=instance.operator,
            order=instance.order,
            notification_type='new_order'
        ).delete()
        
        logger.info(f"Уведомления для заказа #{instance.order.id} очищены")
    except Exception as e:
        logger.error(f"Ошибка при очистке уведомлений: {e}")

# Сигнал для автоматического создания аналитики
@receiver(post_save, sender=Operator)
def create_initial_analytics(sender, instance, created, **kwargs):
    """
    Создает начальную аналитику для нового оператора
    """
    if created:
        try:
            today = timezone.now().date()
            OperatorAnalytics.objects.get_or_create(
                operator=instance,
                date=today,
                defaults={
                    'total_orders': 0,
                    'completed_orders': 0,
                    'cancelled_orders': 0,
                    'total_delivery_time': 0,
                    'avg_delivery_time': 0,
                    'total_earnings': 0
                }
            )
            logger.info(f"Начальная аналитика создана для оператора {instance.username}")
        except Exception as e:
            logger.error(f"Ошибка при создании начальной аналитики: {e}")

 