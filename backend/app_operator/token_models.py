from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string
from app_operator.models import Operator


class OperatorToken(models.Model):
    """
    Кастомная модель токенов для операторов
    """
    key = models.CharField(max_length=40, primary_key=True)
    operator = models.ForeignKey(
        Operator,
        on_delete=models.CASCADE,
        related_name='auth_tokens'
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'operator_tokens'

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = self.generate_key()
        return super().save(*args, **kwargs)

    def generate_key(self):
        return get_random_string(length=40)

    def __str__(self):
        return f"Token for {self.operator.username}"
