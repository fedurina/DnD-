import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AccessToken, LoginRequest, RefreshRequest, TokenPair
from app.schemas.user import UserCreate, UserOut
from app.services import user_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    existing = await user_service.get_user_by_email_or_username(
        db, payload.email, payload.username
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email или именем уже существует",
        )
    return await user_service.create_user(db, payload)


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    user = await user_service.authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    sub = str(user.id)
    return TokenPair(
        access_token=create_access_token(sub),
        refresh_token=create_refresh_token(sub),
    )


@router.post("/refresh", response_model=AccessToken)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> AccessToken:
    try:
        decoded = decode_token(payload.refresh_token, expected_type="refresh")
        user_id = uuid.UUID(decoded["sub"])
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный refresh-токен"
        )

    user = await user_service.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Недействительный refresh-токен"
        )

    return AccessToken(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
