from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccessToken(BaseModel):
    """Login и refresh оба возвращают в теле только access-токен —
    refresh-токен передаётся в httpOnly-куке."""

    access_token: str
    token_type: str = "bearer"
