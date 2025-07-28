import requests
import logging
from django.conf import settings
from .tasks import send_telegram_notification

logger = logging.getLogger('api')

def send_notification(telegram_id, message, parse_mode='HTML'):
    """
    Отправляет уведомление в Telegram асинхронно через Celery
    
    Args:
        telegram_id: ID чата в Telegram
        message: Текст сообщения
        parse_mode: Режим парсинга (HTML или Markdown)
    
    Returns:
        Celery task result object
    """
    try:
        # Отправляем уведомление асинхронно через Celery
        task_result = send_telegram_notification.delay(telegram_id, message, parse_mode)
        
        logger.info(f"Notification queued for chat_id={telegram_id}, task_id={task_result.id}")
        return task_result
        
    except Exception as e:
        logger.error(f"Error queuing notification for chat_id={telegram_id}: {str(e)}")
        # В случае ошибки Celery, отправляем синхронно как fallback
        return send_notification_sync(telegram_id, message, parse_mode)

def send_notification_sync(telegram_id, message, parse_mode='HTML'):
    """
    Синхронная отправка уведомления (fallback)
    
    Args:
        telegram_id: ID чата в Telegram
        message: Текст сообщения
        parse_mode: Режим парсинга (HTML или Markdown)
    
    Returns:
        dict: Результат отправки
    """
    try:
        url = f"https://api.telegram.org/bot{settings.BOT_TOKEN}/sendMessage"
        payload = {
            'chat_id': telegram_id,
            'text': message,
            'parse_mode': parse_mode,
            'disable_web_page_preview': True,
        }
        
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get('ok'):
            logger.info(f"Sync notification sent successfully to chat_id={telegram_id}")
            return {'success': True, 'message_id': result['result']['message_id']}
        else:
            logger.error(f"Sync notification failed for chat_id={telegram_id}: {result.get('description', 'Unknown error')}")
            return {'success': False, 'error': result.get('description', 'Unknown error')}
            
    except Exception as e:
        logger.error(f"Sync notification error for chat_id={telegram_id}: {str(e)}")
        return {'success': False, 'error': str(e)}