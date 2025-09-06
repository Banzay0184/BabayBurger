import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import models
from .models import Order, DeliveryDriver, DeliveryAssignment

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order)
def auto_assign_delivery_order(sender, instance, created, **kwargs):
    """
    Автоматически назначает заказы на доставку курьерам
    """
    # Работаем только с заказами на доставку
    if instance.service_type != 'delivery':
        return
    
    # Работаем только когда заказ переходит в статус 'ready_for_delivery'
    if instance.status == 'ready_for_delivery':
        try:
            # Проверяем, не назначен ли уже заказ курьеру
            existing_assignment = DeliveryAssignment.objects.filter(
                order=instance,
                status__in=['assigned', 'accepted', 'picked_up', 'delivering']
            ).first()
            
            if existing_assignment:
                logger.info(f"Заказ #{instance.id} уже назначен курьеру {existing_assignment.driver.user.first_name}")
                return
            
            # Ищем доступных курьеров для данного ресторана
            available_drivers = DeliveryDriver.objects.filter(
                is_active=True,
                status__in=['active', 'busy'],
                current_orders_count__lt=models.F('max_orders')
            )
            
            # Фильтруем по ресторанам
            if instance.restaurant:
                available_drivers = available_drivers.filter(
                    models.Q(restaurants__isnull=True) |  # Курьеры без привязки к ресторанам
                    models.Q(restaurants=instance.restaurant)  # Курьеры привязанные к этому ресторану
                )
            
            available_drivers = available_drivers.distinct().order_by('current_orders_count', 'rating')
            
            if not available_drivers:
                logger.warning(f"Нет доступных курьеров для заказа #{instance.id}")
                return
            
            # Создаем назначения для всех доступных курьеров
            assignments_created = []
            for driver in available_drivers:
                assignment = DeliveryAssignment.objects.create(
                    order=instance,
                    driver=driver,
                    status='assigned'
                )
                assignments_created.append(assignment)
                logger.info(f"Заказ #{instance.id} назначен курьеру {driver.user.first_name}")
            
            # Отправляем уведомление в Telegram группу
            if assignments_created:
                try:
                    import requests
                    import os
                    
                    bot_token = os.getenv('DELIVERY_BOT_TOKEN')
                    
                    # Используем группу ресторана вместо DELIVERY_GROUP_CHAT_ID
                    group_chat_id = None
                    if instance.restaurant and instance.restaurant.telegram_group_id:
                        group_chat_id = instance.restaurant.telegram_group_id
                    else:
                        # Fallback на старую переменную, если группа ресторана не настроена
                        group_chat_id = os.getenv('DELIVERY_GROUP_CHAT_ID')
                    
                    if bot_token and group_chat_id:
                        # Формируем сообщение
                        message = f"""🚚 <b>Новый заказ на доставку!</b>

📋 Заказ #{instance.id}
🏪 Ресторан: {instance.restaurant.name if instance.restaurant else 'Не указан'}
👤 Клиент: {instance.user.first_name} {instance.user.last_name}
📞 Телефон: {instance.phone}
📍 Адрес: {instance.address.full_address if instance.address else 'Адрес не указан'}
💰 Сумма: {instance.final_price:,} сум
💳 Оплата: {instance.get_payment_method_display()}
⏰ Время: {instance.created_at.strftime('%H:%M')}

🍽️ <b>Заказ:</b>"""
                        
                        # Добавляем товары
                        for item in instance.orderitem_set.all():
                            message += f"\n• {item.quantity}x {item.menu_item.name}"
                            if hasattr(item, 'size_option') and item.size_option:
                                message += f" ({item.size_option.name})"
                            message += f" - {item.menu_item.price * item.quantity:,} сум"
                        
                        if instance.notes:
                            message += f"\n\n📝 <b>Заметки:</b> {instance.notes}"
                        
                        message += f"\n\n👥 Доступно курьеров: {len(assignments_created)}"
                        
                        # Создаем одну кнопку "Взять заказ" для всех курьеров
                        keyboard = [[{
                            "text": "🚚 Взять заказ",
                            "callback_data": f"take_order_{instance.id}"
                        }]]
                        
                        # Отправляем сообщение через Telegram API
                        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                        data = {
                            "chat_id": group_chat_id,
                            "text": message,
                            "parse_mode": "HTML",
                            "reply_markup": {
                                "inline_keyboard": keyboard
                            } if keyboard else None
                        }
                        
                        response = requests.post(url, json=data, timeout=10)
                        if response.status_code == 200:
                            # Сохраняем message_id для последующего обновления
                            response_data = response.json()
                            if response_data.get('ok') and 'result' in response_data:
                                message_id = response_data['result'].get('message_id')
                                if message_id:
                                    # Сохраняем message_id в заказе для последующего обновления
                                    instance.telegram_message_id = message_id
                                    instance.save(update_fields=['telegram_message_id'])
                            logger.info(f"Уведомление о заказе #{instance.id} отправлено в Telegram группу")
                        else:
                            logger.error(f"Ошибка отправки в Telegram: {response.status_code} - {response.text}")
                    
                except Exception as e:
                    logger.error(f"Ошибка при отправке уведомления в Telegram: {e}")
            
        except Exception as e:
            logger.error(f"Ошибка при автоматическом назначении заказа #{instance.id}: {e}")


# Удаляем этот сигнал, так как все уведомления теперь обрабатываются в auto_assign_delivery_order


@receiver(post_save, sender=DeliveryAssignment)
def update_order_status_on_delivery(sender, instance, created, **kwargs):
    """
    Обновляет статус заказа при завершении доставки
    """
    if not created and instance.status == 'delivered':
        try:
            # Обновляем статус заказа на 'completed'
            order = instance.order
            order.status = 'completed'
            order.save(update_fields=['status'])
            
            logger.info(f"Статус заказа #{order.id} обновлен на 'completed' после доставки")
            
        except Exception as e:
            logger.error(f"Ошибка при обновлении статуса заказа #{instance.order.id}: {e}")


# Удаляем этот сигнал, так как все уведомления теперь обрабатываются в auto_assign_delivery_order
