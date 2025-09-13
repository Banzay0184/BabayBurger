"""
Модуль для мониторинга и алертов Telegram API
"""
import logging
import requests
import time
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass

logger = logging.getLogger('api')

@dataclass
class TelegramAPIStatus:
    """Статус Telegram API"""
    is_healthy: bool
    response_time: float
    last_check: datetime
    error_count: int
    last_error: Optional[str] = None

class TelegramMonitor:
    """Мониторинг состояния Telegram API"""
    
    def __init__(self):
        self.bot_token = settings.BOT_TOKEN
        self.cache_key = 'telegram_api_status'
        self.error_threshold = 5  # Максимальное количество ошибок подряд
        self.timeout = 10  # Таймаут для проверки API
        
    def check_api_health(self) -> TelegramAPIStatus:
        """
        Проверяет состояние Telegram API
        
        Returns:
            TelegramAPIStatus: Статус API
        """
        start_time = time.time()
        
        try:
            # Простой запрос к Telegram API
            url = f"https://api.telegram.org/bot{self.bot_token}/getMe"
            response = requests.get(url, timeout=self.timeout)
            
            response_time = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                if data.get('ok'):
                    # API работает нормально
                    status = TelegramAPIStatus(
                        is_healthy=True,
                        response_time=response_time,
                        last_check=datetime.now(),
                        error_count=0
                    )
                    self._update_cache(status)
                    logger.info(f"Telegram API healthy, response time: {response_time:.3f}s")
                    return status
                else:
                    # API вернул ошибку
                    error_msg = data.get('description', 'Unknown API error')
                    return self._handle_api_error(error_msg, response_time)
            else:
                # HTTP ошибка
                return self._handle_api_error(f"HTTP {response.status_code}", response_time)
                
        except requests.RequestException as e:
            response_time = time.time() - start_time
            return self._handle_api_error(f"Network error: {str(e)}", response_time)
        except Exception as e:
            response_time = time.time() - start_time
            return self._handle_api_error(f"Unexpected error: {str(e)}", response_time)
    
    def _handle_api_error(self, error_msg: str, response_time: float) -> TelegramAPIStatus:
        """
        Обрабатывает ошибку API
        
        Args:
            error_msg: Сообщение об ошибке
            response_time: Время ответа
            
        Returns:
            TelegramAPIStatus: Статус с ошибкой
        """
        # Получаем текущий статус из кэша
        cached_status = self._get_cached_status()
        
        error_count = cached_status.error_count + 1 if cached_status else 1
        
        status = TelegramAPIStatus(
            is_healthy=False,
            response_time=response_time,
            last_check=datetime.now(),
            error_count=error_count,
            last_error=error_msg
        )
        
        # Обновляем кэш
        self._update_cache(status)
        
        # Отправляем алерт если превышен порог ошибок
        if error_count >= self.error_threshold:
            self._send_alert(status)
        
        logger.error(f"Telegram API error: {error_msg}, error count: {error_count}")
        return status
    
    def _get_cached_status(self) -> Optional[TelegramAPIStatus]:
        """Получает статус из кэша"""
        try:
            cached_data = cache.get(self.cache_key)
            if cached_data:
                # Конвертируем строку даты обратно в datetime
                if 'last_check' in cached_data and isinstance(cached_data['last_check'], str):
                    from datetime import datetime
                    cached_data['last_check'] = datetime.fromisoformat(cached_data['last_check'])
                return TelegramAPIStatus(**cached_data)
        except Exception as e:
            logger.error(f"Error getting cached status: {e}")
        return None
    
    def _update_cache(self, status: TelegramAPIStatus):
        """Обновляет статус в кэше"""
        try:
            cache_data = {
                'is_healthy': status.is_healthy,
                'response_time': status.response_time,
                'last_check': status.last_check.isoformat(),
                'error_count': status.error_count,
                'last_error': status.last_error
            }
            cache.set(self.cache_key, cache_data, timeout=300)  # 5 минут
        except Exception as e:
            logger.error(f"Error updating cache: {e}")
    
    def _send_alert(self, status: TelegramAPIStatus):
        """
        Отправляет алерт о проблемах с Telegram API
        
        Args:
            status: Статус API с ошибкой
        """
        try:
            # Получаем список администраторов для уведомлений
            admin_telegram_ids = self._get_admin_telegram_ids()
            
            if not admin_telegram_ids:
                logger.warning("No admin Telegram IDs configured for alerts")
                return
            
            alert_message = self._format_alert_message(status)
            
            # Отправляем уведомления администраторам
            for admin_id in admin_telegram_ids:
                self._send_alert_to_admin(admin_id, alert_message)
                
        except Exception as e:
            logger.error(f"Error sending alert: {e}")
    
    def _get_admin_telegram_ids(self) -> List[int]:
        """Получает список Telegram ID администраторов"""
        try:
            # Получаем из настроек или базы данных
            admin_ids_str = getattr(settings, 'ADMIN_TELEGRAM_IDS', '')
            if admin_ids_str:
                return [int(id.strip()) for id in admin_ids_str.split(',') if id.strip()]
            
            # Fallback: получаем из базы данных
            from api.models import User
            admin_users = User.objects.filter(
                telegram_id__isnull=False
            ).exclude(telegram_id__in=['', '0'])[:5]  # Первые 5 пользователей как админы
            
            return [user.telegram_id for user in admin_users]
            
        except Exception as e:
            logger.error(f"Error getting admin Telegram IDs: {e}")
            return []
    
    def _format_alert_message(self, status: TelegramAPIStatus) -> str:
        """Форматирует сообщение алерта"""
        return f"""🚨 <b>ALERT: Telegram API Issues</b>

❌ <b>Status:</b> Unhealthy
⏱️ <b>Response Time:</b> {status.response_time:.3f}s
🔢 <b>Error Count:</b> {status.error_count}
🕐 <b>Last Check:</b> {status.last_check.strftime('%H:%M:%S')}
📝 <b>Last Error:</b> {status.last_error}

⚠️ <b>Action Required:</b> Check Telegram API status and server connectivity.

🔧 <b>Bot Token:</b> {self.bot_token[:10]}..."""
    
    def _send_alert_to_admin(self, admin_id: int, message: str):
        """
        Отправляет алерт конкретному администратору
        
        Args:
            admin_id: Telegram ID администратора
            message: Сообщение алерта
        """
        try:
            # Используем резервный механизм отправки
            from api.telegram_fallback import TelegramFallback
            
            fallback = TelegramFallback()
            result = fallback.send_message(admin_id, message, parse_mode='HTML')
            
            if result['success']:
                logger.info(f"Alert sent to admin {admin_id}")
            else:
                logger.error(f"Failed to send alert to admin {admin_id}: {result.get('error')}")
                
        except Exception as e:
            logger.error(f"Error sending alert to admin {admin_id}: {e}")
    
    def get_current_status(self) -> TelegramAPIStatus:
        """Получает текущий статус API"""
        cached_status = self._get_cached_status()
        
        # Если статус устарел (старше 5 минут), проверяем заново
        if not cached_status or (datetime.now() - cached_status.last_check).seconds > 300:
            return self.check_api_health()
        
        return cached_status
    
    def is_api_healthy(self) -> bool:
        """Проверяет, здоров ли API"""
        status = self.get_current_status()
        return status.is_healthy and status.error_count < self.error_threshold


# Глобальный экземпляр монитора
telegram_monitor = TelegramMonitor()
