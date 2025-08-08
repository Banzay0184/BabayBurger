import logging
import time
import json
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse

logger = logging.getLogger('api')

class CORSMiddleware(MiddlewareMixin):
    """
    Middleware для обработки CORS запросов
    """
    
    def process_request(self, request):
        # Обрабатываем preflight OPTIONS запросы
        if request.method == 'OPTIONS':
            response = HttpResponse()
            response['Access-Control-Allow-Origin'] = '*'
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
            response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning, accept, accept-encoding, dnt, origin, user-agent, x-csrftoken'
            response['Access-Control-Max-Age'] = '86400'
            response['Access-Control-Allow-Credentials'] = 'true'
            return response
        return None
    
    def process_response(self, request, response):
        # Добавляем CORS заголовки для всех ответов
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning, accept, accept-encoding, dnt, origin, user-agent, x-csrftoken'
        response['Access-Control-Expose-Headers'] = 'Content-Type, Content-Length'
        response['Access-Control-Allow-Credentials'] = 'true'
        return response

class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware для логирования всех запросов и ответов
    """
    
    def process_request(self, request):
        # Засекаем время начала запроса
        request.start_time = time.time()
        
        # Логируем входящий запрос
        log_data = {
            'type': 'request',
            'method': request.method,
            'path': request.path,
            'user': str(request.user),
            'ip': self.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        }
        
        # Добавляем параметры запроса
        if request.GET:
            log_data['query_params'] = dict(request.GET)
        if request.POST:
            log_data['post_data'] = dict(request.POST)
            
        logger.info(f"Входящий запрос: {json.dumps(log_data, ensure_ascii=False)}")
        
        return None
    
    def process_response(self, request, response):
        # Вычисляем время выполнения
        duration = time.time() - getattr(request, 'start_time', time.time())
        
        # Логируем ответ
        log_data = {
            'type': 'response',
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration': round(duration, 3),
            'user': str(request.user),
            'ip': self.get_client_ip(request),
        }
        
        # Добавляем размер ответа если это возможно
        if hasattr(response, 'content'):
            log_data['response_size'] = len(response.content)
            
        logger.info(f"Ответ: {json.dumps(log_data, ensure_ascii=False)}")
        
        return response
    
    def process_exception(self, request, exception):
        # Логируем исключения
        duration = time.time() - getattr(request, 'start_time', time.time())
        
        log_data = {
            'type': 'error',
            'method': request.method,
            'path': request.path,
            'exception': str(exception),
            'exception_type': type(exception).__name__,
            'duration': round(duration, 3),
            'user': str(request.user),
            'ip': self.get_client_ip(request),
        }
        
        logger.error(f"Ошибка: {json.dumps(log_data, ensure_ascii=False)}")
        
        return None
    
    def get_client_ip(self, request):
        """Получаем IP адрес клиента"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip 