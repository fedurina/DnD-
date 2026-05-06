from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AccessToken(BaseModel):
    """Login and refresh both return only an access token in the body —
    refresh token travels in an httpOnly cookie."""

    access_token: str
    token_type: str = "bearer"
