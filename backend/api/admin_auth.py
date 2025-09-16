from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.authtoken.models import Token
from app_operator.models import Operator


class AdminTokenAuthentication(BaseAuthentication):
    """
    Кастомная аутентификация для админ-панели
    Работает с кастомной моделью пользователя Operator (AUTH_USER_MODEL)
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
            token = Token.objects.get(key=token_key)
            user = token.user
            
            # Проверяем, что пользователь является администратором
            if not user.is_staff:
                raise AuthenticationFailed('Недостаточно прав для доступа к админ-панели')
                
            return (user, token)
            
        except Token.DoesNotExist:
            raise AuthenticationFailed('Неверный токен аутентификации')
        except Exception as e:
            raise AuthenticationFailed(f'Ошибка аутентификации: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'
