"""Ограничение частоты запросов по IP через slowapi.

В тестах ограничения должны быть фактически отключены — за сессию проходит
много auth-сценариев. Переключатель Settings.ENV позволяет оставить лимитер
подключённым, но неактивным.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

_storage_uri = "memory://"

# Лимитер в памяти процесса — годится для одного процесса uvicorn. Для
# многопроцессного продакшена укажите storage_uri на Redis.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    enabled=settings.ENV != "test",
)
