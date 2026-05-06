"""Per-IP rate limiting via slowapi.

In tests we want limits effectively disabled — there are many auth flows per
session. The Settings.ENV switch lets us keep the limiter wired but inert.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

_storage_uri = "memory://"

# In-memory limiter — fine for a single uvicorn process. For multi-worker
# production, point storage_uri at Redis.
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    enabled=settings.ENV != "test",
)
