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
        
        print(f"🔐 AdminTokenAuthentication: {request.method} {request.path}")
        print(f"🔐 Auth header: {auth_header}")
        
        if not auth_header:
            print("🔐 No auth header")
            return None
            
        try:
            # Проверяем формат "Bearer <token>"
            auth_type, token_key = auth_header.split(' ', 1)
            if auth_type.lower() != 'bearer':
                print(f"🔐 Invalid auth type: {auth_type}")
                return None
        except ValueError:
            print("🔐 Invalid auth header format")
            return None
            
        try:
            # Ищем токен в базе данных
            token = Token.objects.get(key=token_key)
            user = token.user
            
            print(f"🔐 Token found: {token_key[:10]}... User: {user.username} (is_staff: {user.is_staff})")
            print(f"🔐 User type: {type(user)}")
            print(f"🔐 User ID: {user.id}")
            
            # Проверяем, что пользователь является администратором
            if not user.is_staff:
                print("🔐 User is not staff")
                raise AuthenticationFailed('Недостаточно прав для доступа к админ-панели')
                
            print("🔐 Authentication successful")
            return (user, token)
            
        except Token.DoesNotExist:
            print(f"🔐 Token not found: {token_key[:10]}...")
            # Давайте проверим все токены для отладки
            all_tokens = Token.objects.all()
            print(f"🔐 Available tokens: {[t.key[:10] + '...' for t in all_tokens]}")
            raise AuthenticationFailed('Неверный токен аутентификации')
        except Exception as e:
            print(f"🔐 Authentication error: {str(e)}")
            raise AuthenticationFailed(f'Ошибка аутентификации: {str(e)}')
    
    def authenticate_header(self, request):
        return 'Bearer'
