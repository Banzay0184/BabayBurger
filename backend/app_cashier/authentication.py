from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from .models import CashierToken, Cashier

class CashierTokenAuthentication(BaseAuthentication):
    """
    Кастомная аутентификация для кассиров через токены
    """
    keyword = 'Token'

    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        try:
            auth_type, token_key = auth_header.split(' ', 1)
            if auth_type.lower() != self.keyword.lower():
                return None
        except ValueError:
            return None

        try:
            token = CashierToken.objects.select_related('cashier').get(key=token_key)
            if not token.cashier.is_active or not token.cashier.is_active_cashier:
                raise AuthenticationFailed('Кассир неактивен')
            return (token.cashier, token)
        except CashierToken.DoesNotExist:
            raise AuthenticationFailed('Неверный токен')

    def authenticate_header(self, request):
        return self.keyword
