import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _encode(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str) -> str:
    now = datetime.now(timezone.utc)
    return _encode(
        {
            "sub": subject,
            "type": "access",
            "iat": now,
            "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        }
    )


def create_refresh_token(subject: str) -> tuple[str, uuid.UUID, datetime]:
    """Возвращает (encoded_jwt, jti, expires_at), чтобы вызывающий мог сохранить запись."""
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4()
    exp = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    token = _encode(
        {
            "sub": subject,
            "type": "refresh",
            "jti": str(jti),
            "iat": now,
            "exp": exp,
        }
    )
    return token, jti, exp


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("invalid token") from exc

    if payload.get("type") != expected_type:
        raise ValueError(f"expected {expected_type} token")

    return payload
