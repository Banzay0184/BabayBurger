from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.db import transaction
import logging

from .models import (
    Operator, OperatorSession, OrderAssignment, OrderStatusHistory, 
    OperatorNotification, OperatorAnalytics
)
from api.models import Order

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Order)
def notify_operators_new_order(sender, instance, created, **kwargs):
    """
    Уведомляет операторов о новом заказе
    """
    if created and instance.status == 'pending':
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
        
        # Создаем уведомления для подходящих операторов
        for operator in suitable_operators:
            try:
                OperatorNotification.objects.create(
                    operator=operator,
                    notification_type='new_order',
                    title='Новый заказ',
                    message=f'Поступил новый заказ #{instance.id} на сумму {instance.total_price} UZS',
                    order=instance
                )
                logger.info(f"Уведомление о новом заказе #{instance.id} отправлено оператору {operator.username}")
            except Exception as e:
                logger.error(f"Ошибка при создании уведомления для оператора {operator.username}: {e}")

@receiver(post_save, sender=OrderAssignment)
def notify_order_assignment(sender, instance, created, **kwargs):
    """
    Уведомляет оператора о назначении заказа
    """
    if created:
        try:
            OperatorNotification.objects.create(
                operator=instance.operator,
                notification_type='new_order',
                title='Заказ назначен',
                message=f'Вам назначен заказ #{instance.order.id}',
                order=instance.order
            )
            logger.info(f"Уведомление о назначении заказа #{instance.order.id} отправлено оператору {instance.operator.username}")
        except Exception as e:
            logger.error(f"Ошибка при создании уведомления о назначении: {e}")

@receiver(post_save, sender=OrderStatusHistory)
def notify_status_change(sender, instance, created, **kwargs):
    """
    Уведомляет операторов об изменении статуса заказа
    """
    if created:
        # Уведомляем оператора, который изменил статус
        try:
            status_display = dict(Order.STATUS_CHOICES).get(instance.new_status, instance.new_status)
            OperatorNotification.objects.create(
                operator=instance.operator,
                notification_type='order_status_change',
                title='Статус заказа изменен',
                message=f'Статус заказа #{instance.order.id} изменен на "{status_display}"',
                order=instance.order
            )
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

 