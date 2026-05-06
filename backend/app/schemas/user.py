import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.user import UserRole

# Most-common leaked passwords. Tiny embedded list — for serious deployments swap
# for a proper check (e.g. zxcvbn or HIBP API).
_BANNED_PASSWORDS = {
    "password", "password1", "qwerty123", "12345678", "123456789",
    "qwertyui", "11111111", "00000000", "iloveyou", "letmein1",
    "admin123", "welcome1", "passw0rd", "abcd1234", "qwerty12",
}


def _validate_password_strength(value: str) -> str:
    if not any(c.isalpha() for c in value):
        raise ValueError("Пароль должен содержать хотя бы одну букву")
    if not any(c.isdigit() for c in value):
        raise ValueError("Пароль должен содержать хотя бы одну цифру")
    if value.lower() in _BANNED_PASSWORDS:
        raise ValueError("Этот пароль слишком распространён, выберите другой")
    return value


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.PLAYER

    @field_validator("password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return _validate_password_strength(v)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str
    role: UserRole
    is_active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = Field(
        default=None, min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$"
    )


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _check_password(cls, v: str) -> str:
        return _validate_password_strength(v)
