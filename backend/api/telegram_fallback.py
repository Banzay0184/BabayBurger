"""
Резервные механизмы для Telegram API
"""
import logging
import requests
import time
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import json

logger = logging.getLogger('api')

@dataclass
class FallbackMessage:
    """Сообщение для резервной отправки"""
    chat_id: int
    text: str
    parse_mode: str = 'HTML'
    reply_markup: Optional[Dict] = None
    created_at: datetime = None
    retry_count: int = 0
    max_retries: int = 3
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class TelegramFallback:
    """Резервные механизмы для Telegram API"""
    
    def __init__(self):
        self.bot_token = settings.BOT_TOKEN
        self.fallback_queue_key = 'telegram_fallback_queue'
        self.failed_messages_key = 'telegram_failed_messages'
        self.max_queue_size = 1000
        self.retry_delay = 60  # секунд между попытками
        
    def send_message(self, chat_id: int, text: str, parse_mode: str = 'HTML', 
                    reply_markup: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Отправляет сообщение с резервными механизмами
        
        Args:
            chat_id: ID чата
            text: Текст сообщения
            parse_mode: Режим парсинга
            reply_markup: Клавиатура
            
        Returns:
            Dict: Результат отправки
        """
        try:
            # Сначала пробуем обычную отправку
            result = self._send_direct_message(chat_id, text, parse_mode, reply_markup)
            
            if result['success']:
                return result
            
            # Если не удалось, добавляем в очередь для повторной отправки
            logger.warning(f"Direct send failed, adding to fallback queue: {result.get('error')}")
            self._add_to_fallback_queue(chat_id, text, parse_mode, reply_markup)
            
            return {
                'success': False,
                'error': 'Message queued for retry',
                'queued': True
            }
            
        except Exception as e:
            logger.error(f"Error in send_message: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _send_direct_message(self, chat_id: int, text: str, parse_mode: str = 'HTML',
                           reply_markup: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Прямая отправка сообщения через Telegram API
        
        Args:
            chat_id: ID чата
            text: Текст сообщения
            parse_mode: Режим парсинга
            reply_markup: Клавиатура
            
        Returns:
            Dict: Результат отправки
        """
        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            
            data = {
                'chat_id': chat_id,
                'text': text,
                'parse_mode': parse_mode,
                'disable_web_page_preview': True
            }
            
            if reply_markup:
                data['reply_markup'] = reply_markup
            
            response = requests.post(url, json=data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('ok'):
                    return {
                        'success': True,
                        'message_id': result['result']['message_id'],
                        'chat_id': chat_id
                    }
                else:
                    return {
                        'success': False,
                        'error': f"Telegram API error: {result.get('description', 'Unknown error')}"
                    }
            else:
                return {
                    'success': False,
                    'error': f"HTTP {response.status_code}: {response.text}"
                }
                
        except requests.RequestException as e:
            return {
                'success': False,
                'error': f"Network error: {str(e)}"
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"Unexpected error: {str(e)}"
            }
    
    def _add_to_fallback_queue(self, chat_id: int, text: str, parse_mode: str = 'HTML',
                              reply_markup: Optional[Dict] = None):
        """
        Добавляет сообщение в очередь для повторной отправки
        
        Args:
            chat_id: ID чата
            text: Текст сообщения
            parse_mode: Режим парсинга
            reply_markup: Клавиатура
        """
        try:
            message = FallbackMessage(
                chat_id=chat_id,
                text=text,
                parse_mode=parse_mode,
                reply_markup=reply_markup
            )
            
            # Получаем текущую очередь
            queue = self._get_fallback_queue()
            
            # Проверяем размер очереди
            if len(queue) >= self.max_queue_size:
                logger.warning("Fallback queue is full, removing oldest messages")
                queue = queue[-self.max_queue_size//2:]  # Удаляем половину старых сообщений
            
            # Добавляем новое сообщение
            queue.append(asdict(message))
            
            # Сохраняем очередь
            cache.set(self.fallback_queue_key, queue, timeout=3600)  # 1 час
            
            logger.info(f"Message added to fallback queue, queue size: {len(queue)}")
            
        except Exception as e:
            logger.error(f"Error adding to fallback queue: {e}")
    
    def _get_fallback_queue(self) -> List[Dict]:
        """Получает очередь резервных сообщений"""
        try:
            queue = cache.get(self.fallback_queue_key, [])
            return queue if isinstance(queue, list) else []
        except Exception as e:
            logger.error(f"Error getting fallback queue: {e}")
            return []
    
    def process_fallback_queue(self) -> Dict[str, Any]:
        """
        Обрабатывает очередь резервных сообщений
        
        Returns:
            Dict: Статистика обработки
        """
        try:
            queue = self._get_fallback_queue()
            
            if not queue:
                return {
                    'success': True,
                    'processed': 0,
                    'failed': 0,
                    'message': 'No messages in queue'
                }
            
            processed = 0
            failed = 0
            remaining_queue = []
            
            for message_data in queue:
                try:
                    message = FallbackMessage(**message_data)
                    
                    # Проверяем, не превышено ли количество попыток
                    if message.retry_count >= message.max_retries:
                        logger.warning(f"Message exceeded max retries, moving to failed: {message.chat_id}")
                        self._add_to_failed_messages(message)
                        failed += 1
                        continue
                    
                    # Проверяем, прошло ли достаточно времени с последней попытки
                    time_since_created = datetime.now() - message.created_at
                    if time_since_created.total_seconds() < self.retry_delay * (message.retry_count + 1):
                        remaining_queue.append(message_data)
                        continue
                    
                    # Пробуем отправить сообщение
                    result = self._send_direct_message(
                        message.chat_id,
                        message.text,
                        message.parse_mode,
                        message.reply_markup
                    )
                    
                    if result['success']:
                        processed += 1
                        logger.info(f"Fallback message sent successfully: {message.chat_id}")
                    else:
                        # Увеличиваем счетчик попыток
                        message.retry_count += 1
                        remaining_queue.append(asdict(message))
                        logger.warning(f"Fallback message retry failed: {result.get('error')}")
                        
                except Exception as e:
                    logger.error(f"Error processing fallback message: {e}")
                    failed += 1
            
            # Сохраняем обновленную очередь
            cache.set(self.fallback_queue_key, remaining_queue, timeout=3600)
            
            return {
                'success': True,
                'processed': processed,
                'failed': failed,
                'remaining': len(remaining_queue)
            }
            
        except Exception as e:
            logger.error(f"Error processing fallback queue: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _add_to_failed_messages(self, message: FallbackMessage):
        """
        Добавляет сообщение в список неудачных
        
        Args:
            message: Сообщение для добавления
        """
        try:
            failed_messages = cache.get(self.failed_messages_key, [])
            
            failed_data = asdict(message)
            failed_data['failed_at'] = datetime.now().isoformat()
            
            failed_messages.append(failed_data)
            
            # Ограничиваем размер списка
            if len(failed_messages) > 100:
                failed_messages = failed_messages[-50:]  # Оставляем последние 50
            
            cache.set(self.failed_messages_key, failed_messages, timeout=86400)  # 24 часа
            
        except Exception as e:
            logger.error(f"Error adding to failed messages: {e}")
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """
        Получает статистику очереди
        
        Returns:
            Dict: Статистика очереди
        """
        try:
            queue = self._get_fallback_queue()
            failed_messages = cache.get(self.failed_messages_key, [])
            
            return {
                'queue_size': len(queue),
                'failed_count': len(failed_messages),
                'max_queue_size': self.max_queue_size,
                'retry_delay': self.retry_delay
            }
            
        except Exception as e:
            logger.error(f"Error getting queue stats: {e}")
            return {
                'error': str(e)
            }
    
    def clear_queue(self):
        """Очищает очередь резервных сообщений"""
        try:
            cache.delete(self.fallback_queue_key)
            cache.delete(self.failed_messages_key)
            logger.info("Fallback queue cleared")
        except Exception as e:
            logger.error(f"Error clearing queue: {e}")


# Глобальный экземпляр резервного механизма
telegram_fallback = TelegramFallback()
