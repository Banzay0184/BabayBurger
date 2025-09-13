import os
import requests
import logging
from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

def _build_detailed_order_message(order, new_status):
    """
    Формирует детальное сообщение о заказе для Telegram
    
    Args:
        order: Объект заказа
        new_status: Новый статус заказа
    
    Returns:
        str: Форматированное сообщение
    """
    # Статусы и их сообщения
    status_messages = {
        'pending': '🕐 Ваш заказ принят и ожидает обработки',
        'assigned': '👨‍💼 Ваш заказ назначен оператору',
        'confirmed': '✅ Ваш заказ подтвержден!',
        'preparing': '🍳 Ваш заказ готовится!',
        'ready_for_delivery': '📦 Ваш заказ готов к доставке!',
        'delivering': '🚚 Ваш заказ в пути!',
        'completed': '🎉 Заказ выполнен! Спасибо за покупку!',
        'cancelled': '❌ Заказ отменен',
        'rejected': '🚫 Заказ отклонен'
    }
    
    # Основное сообщение о статусе
    status_text = status_messages.get(new_status, f'Статус заказа изменен на: {new_status}')
    
    # Информация о заказе
    order_info = f"""
🍔 <b>Заказ #{order.id}</b>
{status_text}

💰 <b>Сумма:</b> {order.total_price:,.0f} UZS
📍 <b>Адрес:</b> {order.address.street}, {order.address.city}
⏰ <b>Время:</b> {order.created_at.strftime('%H:%M')}
"""
    
    # Информация о блюдах
    if order.orderitem_set.exists():
        order_info += "\n📋 <b>Ваш заказ:</b>\n"
        for item in order.orderitem_set.all():
            item_text = f"• {item.menu_item.name}"
            if item.size_option:
                item_text += f" ({item.size_option.name})"
            if item.add_ons.exists():
                addons = ", ".join([addon.name for addon in item.add_ons.all()])
                item_text += f" + {addons}"
            item_text += f" x{item.quantity}"
            order_info += f"{item_text}\n"
    
    # Информация о ресторане
    if order.restaurant:
        order_info += f"\n🏪 <b>Ресторан:</b> {order.restaurant.name}"
    
    # Информация о способе получения
    if order.service_type == 'delivery':
        order_info += "\n🚚 <b>Доставка</b>"
    elif order.service_type == 'pickup':
        order_info += "\n🏃‍♂️ <b>Самовывоз</b>"
    
    # Дополнительная информация в зависимости от статуса
    if new_status == 'preparing':
        order_info += "\n\n⏳ Примерное время готовности: 15-30 минут"
    elif new_status == 'delivering':
        order_info += "\n\n🚚 Курьер свяжется с вами перед доставкой"
    elif new_status == 'completed':
        order_info += "\n\n🙏 Спасибо за заказ! Приятного аппетита!"
    
    return order_info.strip()

@shared_task(
    bind=True,
    name='api.tasks.send_telegram_notification',
    queue='notifications',
    autoretry_for=(requests.RequestException,),
    retry_kwargs={'max_retries': 3, 'countdown': 5},
    retry_backoff=True,
)
def send_telegram_notification(self, chat_id, message, parse_mode='HTML'):
    """
    Асинхронная задача для отправки уведомлений в Telegram
    
    Args:
        chat_id: ID чата в Telegram
        message: Текст сообщения
        parse_mode: Режим парсинга (HTML или Markdown)
    
    Returns:
        dict: Результат отправки
    """
    try:
        # Получаем токен бота из настроек
        bot_token = settings.BOT_TOKEN
        if not bot_token:
            logger.error("BOT_TOKEN not configured")
            return {'success': False, 'error': 'BOT_TOKEN not configured'}
        
        # URL для отправки сообщения
        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        
        # Данные для отправки
        data = {
            'chat_id': chat_id,
            'text': message,
            'parse_mode': parse_mode,
            'disable_web_page_preview': True,
        }
        
        # Отправляем запрос с таймаутом
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get('ok'):
            logger.info(f"Notification sent successfully to chat_id={chat_id}")
            return {
                'success': True,
                'message_id': result['result']['message_id'],
                'chat_id': chat_id
            }
        else:
            error_msg = f"Telegram API error: {result.get('description', 'Unknown error')}"
            logger.error(f"Failed to send notification to chat_id={chat_id}: {error_msg}")
            return {'success': False, 'error': error_msg}
            
    except requests.RequestException as e:
        logger.error(f"Network error sending notification to chat_id={chat_id}: {str(e)}")
        # Повторяем попытку через Celery
        raise self.retry(exc=e, countdown=5)
        
    except Exception as e:
        logger.error(f"Unexpected error sending notification to chat_id={chat_id}: {str(e)}")
        return {'success': False, 'error': str(e)}

@shared_task(
    bind=True,
    name='api.tasks.send_bulk_notifications',
    queue='notifications',
    autoretry_for=(requests.RequestException,),
    retry_kwargs={'max_retries': 2, 'countdown': 10},
)
def send_bulk_notifications(self, notifications_data):
    """
    Асинхронная задача для массовой отправки уведомлений
    
    Args:
        notifications_data: Список словарей с данными для отправки
            [{'chat_id': 123, 'message': 'text', 'parse_mode': 'HTML'}, ...]
    
    Returns:
        dict: Результат массовой отправки
    """
    try:
        results = []
        success_count = 0
        error_count = 0
        
        for notification in notifications_data:
            try:
                result = send_telegram_notification.delay(
                    notification['chat_id'],
                    notification['message'],
                    notification.get('parse_mode', 'HTML')
                )
                results.append({
                    'chat_id': notification['chat_id'],
                    'task_id': result.id,
                    'status': 'queued'
                })
                success_count += 1
                
            except Exception as e:
                logger.error(f"Error queuing notification for chat_id={notification['chat_id']}: {str(e)}")
                results.append({
                    'chat_id': notification['chat_id'],
                    'error': str(e),
                    'status': 'failed'
                })
                error_count += 1
        
        logger.info(f"Bulk notifications queued: {success_count} success, {error_count} errors")
        return {
            'success': True,
            'total': len(notifications_data),
            'success_count': success_count,
            'error_count': error_count,
            'results': results
        }
        
    except Exception as e:
        logger.error(f"Error in bulk notifications: {str(e)}")
        return {'success': False, 'error': str(e)}

@shared_task(
    bind=True,
    name='api.tasks.send_order_status_notification',
    queue='notifications',
)
def send_order_status_notification(self, chat_id, order_id, old_status, new_status):
    """
    Специализированная задача для отправки уведомлений об изменении статуса заказа
    
    Args:
        chat_id: ID чата в Telegram
        order_id: ID заказа
        old_status: Предыдущий статус
        new_status: Новый статус
    
    Returns:
        dict: Результат отправки
    """
    try:
        from api.models import Order
        
        # Получаем заказ с полной информацией
        try:
            order = Order.objects.select_related(
                'user', 'address', 'restaurant', 'promo_code'
            ).prefetch_related(
                'orderitem_set__menu_item',
                'orderitem_set__size_option',
                'orderitem_set__add_ons'
            ).get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found")
            return {'success': False, 'error': 'Order not found'}
        
        # Формируем детальное сообщение
        message = _build_detailed_order_message(order, new_status)
        
        # Отправляем уведомление
        result = send_telegram_notification.delay(chat_id, message)
        
        logger.info(f"Order status notification queued: order_id={order_id}, {old_status}->{new_status}")
        return {
            'success': True,
            'order_id': order_id,
            'old_status': old_status,
            'new_status': new_status,
            'task_id': result.id
        }
        
    except Exception as e:
        logger.error(f"Error sending order status notification: {str(e)}")
        return {'success': False, 'error': str(e)}

@shared_task(
    bind=True,
    name='api.tasks.cleanup_old_notifications',
    queue='default',
)
def cleanup_old_notifications(self):
    """
    Задача для очистки старых уведомлений из кэша
    """
    try:
        # Очищаем старые записи из кэша (старше 24 часов)
        cache_keys = cache.keys('notification_*')
        cleaned_count = 0
        
        for key in cache_keys:
            # Здесь можно добавить логику очистки старых уведомлений
            # Пока просто логируем
            cleaned_count += 1
        
        logger.info(f"Cleaned up {cleaned_count} old notification records")
        return {'success': True, 'cleaned_count': cleaned_count}
        
    except Exception as e:
        logger.error(f"Error cleaning up notifications: {str(e)}")
        return {'success': False, 'error': str(e)} 

@shared_task(bind=True, name='api.tasks.geocode_yandex', queue='default')
def geocode_yandex(self, address=None, lat=None, lon=None):
    """
    Асинхронная задача для геокодирования через Яндекс.Карты с кэшированием
    address: строка адреса (прямое геокодирование)
    lat, lon: координаты (обратное геокодирование)
    """
    try:
        api_key = settings.YANDEX_MAPS_API_KEY
        url = 'https://geocode-maps.yandex.ru/1.x/'
        cache_key = None
        params = {
            'apikey': api_key,
            'format': 'json',
            'lang': 'ru_RU',
        }
        if address:
            cache_key = f'yandex_geocode:{address.strip().lower()}'
            params['geocode'] = address
        elif lat is not None and lon is not None:
            cache_key = f'yandex_reverse:{lat},{lon}'
            params['geocode'] = f'{lon},{lat}'
        else:
            return {'error': 'address or lat/lon required'}

        # Проверяем кэш
        cached = cache.get(cache_key)
        if cached:
            return {'cached': True, 'result': cached}

        # Запрос к Яндекс API
        r = requests.get(url, params=params, timeout=10)
        if r.status_code != 200:
            return {'error': 'Yandex API error', 'details': r.text}
        
        resp = r.json()
        try:
            feature = resp['response']['GeoObjectCollection']['featureMember'][0]['GeoObject']
            if address:
                pos = feature['Point']['pos']
                lon_, lat_ = pos.split()
                result = {'lat': float(lat_), 'lon': float(lon_), 'raw': feature}
            else:
                result_address = feature['metaDataProperty']['GeocoderMetaData']['text']
                result = {'address': result_address, 'raw': feature}
            # Кэшируем результат на 24 часа
            cache.set(cache_key, result, 60*60*24)
            return {'cached': False, 'result': result}
        except Exception as e:
            return {'error': 'Not found', 'details': str(e)}
            
    except Exception as e:
        return {'error': str(e)}


@shared_task(
    name='api.tasks.reset_operator_order_numbers',
    queue='maintenance',
)
def reset_operator_order_numbers():
    """
    Задача для сброса номеров заказов операторов в полночь
    Вызывается каждый день в 00:00
    """
    try:
        from app_operator.models import OperatorOrderNumber
        
        # Получаем вчерашнюю дату
        yesterday = timezone.now().date() - timedelta(days=1)
        
        # Удаляем записи за вчерашний день
        deleted_count = OperatorOrderNumber.objects.filter(date=yesterday).delete()[0]
        
        logger.info(f"🔄 Сброс номеров заказов операторов: удалено {deleted_count} записей за {yesterday}")
        
        return {
            'success': True,
            'deleted_count': deleted_count,
            'date': yesterday.isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Ошибка при сбросе номеров заказов операторов: {e}")
        return {
            'success': False,
            'error': str(e)
        }

@shared_task(
    bind=True,
    name='api.tasks.send_cart_updated_notification',
    queue='notifications',
    autoretry_for=(requests.RequestException,),
    retry_kwargs={'max_retries': 3, 'countdown': 5},
    retry_backoff=True,
)
def send_cart_updated_notification(self, telegram_id, order_id, operator_name):
    """
    Отправка уведомления клиенту об изменении корзины заказа оператором
    
    Args:
        telegram_id: ID пользователя в Telegram
        order_id: ID заказа
        operator_name: Имя оператора
    
    Returns:
        dict: Результат отправки
    """
    try:
        if not telegram_id:
            logger.warning(f"No telegram_id for order {order_id}")
            return {'success': False, 'error': 'No telegram_id'}
        
        from api.models import Order
        
        # Получаем заказ с полной информацией
        try:
            order = Order.objects.select_related(
                'user', 'address', 'restaurant', 'promo_code'
            ).prefetch_related(
                'orderitem_set__menu_item',
                'orderitem_set__size_option',
                'orderitem_set__add_ons'
            ).get(id=order_id)
        except Order.DoesNotExist:
            logger.error(f"Order {order_id} not found")
            return {'success': False, 'error': 'Order not found'}
        
        # Формируем детальное сообщение об изменении корзины
        message = f"""
🛒 <b>Ваш заказ #{order.id} был скорректирован</b>

Оператор <b>{operator_name}</b> внес корректировки в состав вашего заказа.

💰 <b>Новая сумма:</b> {order.total_price:,.0f} UZS
📍 <b>Адрес:</b> {order.address.street}, {order.address.city}
⏰ <b>Время:</b> {order.created_at.strftime('%H:%M')}
"""
        
        # Информация о блюдах
        if order.orderitem_set.exists():
            message += "\n📋 <b>Обновленный состав заказа:</b>\n"
            for item in order.orderitem_set.all():
                item_text = f"• {item.menu_item.name}"
                if item.size_option:
                    item_text += f" ({item.size_option.name})"
                if item.add_ons.exists():
                    addons = ", ".join([addon.name for addon in item.add_ons.all()])
                    item_text += f" + {addons}"
                item_text += f" x{item.quantity}"
                message += f"{item_text}\n"
        
        # Информация о ресторане
        if order.restaurant:
            message += f"\n🏪 <b>Ресторан:</b> {order.restaurant.name}"
        
        # Информация о способе получения
        if order.service_type == 'delivery':
            message += "\n🚚 <b>Доставка</b>"
        elif order.service_type == 'pickup':
            message += "\n🏃‍♂️ <b>Самовывоз</b>"
        
        message += "\n\n✅ <b>Ваш заказ остается в том же статусе</b> - никаких дополнительных действий не требуется."
        message += "\n\nЕсли у вас есть вопросы по изменениям, свяжитесь с нами."
        
        return send_telegram_notification.delay(telegram_id, message.strip())
        
    except Exception as e:
        logger.error(f"Failed to send cart update notification: {str(e)}")
        return {'success': False, 'error': str(e)} 