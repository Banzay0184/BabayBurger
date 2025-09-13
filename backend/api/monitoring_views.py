"""
API endpoints для мониторинга Telegram API
"""
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.http import JsonResponse
from api.telegram_monitor import telegram_monitor
from api.telegram_fallback import telegram_fallback

logger = logging.getLogger('api')

class TelegramAPIStatusView(APIView):
    """API endpoint для проверки состояния Telegram API"""
    
    def get(self, request):
        """Получает текущий статус Telegram API"""
        try:
            status = telegram_monitor.get_current_status()
            
            return Response({
                'success': True,
                'is_healthy': status.is_healthy,
                'response_time': status.response_time,
                'error_count': status.error_count,
                'last_check': status.last_check.isoformat(),
                'last_error': status.last_error
            }, status=http_status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting Telegram API status: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class TelegramFallbackStatsView(APIView):
    """API endpoint для статистики резервной очереди"""
    
    def get(self, request):
        """Получает статистику резервной очереди"""
        try:
            stats = telegram_fallback.get_queue_stats()
            
            return Response({
                'success': True,
                **stats
            }, status=http_status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error getting fallback stats: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def post(self, request):
        """Обрабатывает очередь резервных сообщений вручную"""
        try:
            result = telegram_fallback.process_fallback_queue()
            
            return Response({
                'success': True,
                **result
            }, status=http_status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing fallback queue: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def delete(self, request):
        """Очищает очередь резервных сообщений"""
        try:
            telegram_fallback.clear_queue()
            
            return Response({
                'success': True,
                'message': 'Queue cleared successfully'
            }, status=http_status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error clearing queue: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=http_status.HTTP_500_INTERNAL_SERVER_ERROR)

class TelegramHealthCheckView(APIView):
    """Простая проверка здоровья для мониторинга"""
    
    def get(self, request):
        """Возвращает статус здоровья системы"""
        try:
            # Проверяем состояние Telegram API
            api_status = telegram_monitor.get_current_status()
            
            # Проверяем статистику очереди
            queue_stats = telegram_fallback.get_queue_stats()
            
            # Определяем общий статус здоровья
            is_healthy = (
                api_status.is_healthy and 
                api_status.error_count < 5 and
                queue_stats.get('queue_size', 0) < 100
            )
            
            return JsonResponse({
                'status': 'healthy' if is_healthy else 'unhealthy',
                'telegram_api': {
                    'healthy': api_status.is_healthy,
                    'response_time': api_status.response_time,
                    'error_count': api_status.error_count
                },
                'fallback_queue': queue_stats,
                'timestamp': api_status.last_check.isoformat()
            }, status=200 if is_healthy else 503)
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return JsonResponse({
                'status': 'error',
                'error': str(e)
            }, status=500)
