from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authtoken.models import Token
from app_operator.models import Operator


class AdminTokenAuthentication(BaseAuthentication):
    """
    Кастомная аутентификация для админ-панели
    Работает с кастомной моделью пользователя Operator
    """
    
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
            
        try:
            # Проверяем формат "Bearer <token>"
            auth_type, token_key = auth_header.split(' ', 1)
            if auth_type.lower() != 'bearer':
                return None
        except ValueError:
            return None
            
        try:
            # Ищем токен в базе данных
            token = OperatorToken.objects.get(key=token_key)
            operator = token.operator
            
            # Проверяем, что оператор является администратором
            if not operator.is_staff:
                raise AuthenticationFailed('Недостаточно прав для доступа к админ-панели')
                
            return (operator, token)
            
        except OperatorToken.DoesNotExist:
            raise AuthenticationFailed('Неверный токен аутентификации')
        except Exception as e:
            raise AuthenticationFailed(f'Ошибка аутентификации: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'
