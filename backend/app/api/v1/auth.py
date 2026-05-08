import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AccessToken, LoginRequest
from app.schemas.user import UserCreate, UserOut
from app.services import refresh_token_service, user_service

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE_NAME = "refresh_token"
REFRESH_COOKIE_PATH = settings.API_V1_PREFIX + "/auth"


def _set_refresh_cookie(response: Response, token: str, max_age_seconds: int) -> None:
    secure = settings.ENV == "production"
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        max_age=max_age_seconds,
        httponly=True,
        secure=secure,
        samesite="lax",
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


async def _issue_refresh(
    db: AsyncSession,
    response: Response,
    user: User,
    user_agent: str | None,
) -> None:
    token, jti, exp = create_refresh_token(str(user.id))
    await refresh_token_service.store(
        db,
        jti=jti,
        user_id=user.id,
        expires_at=exp,
        user_agent=(user_agent or None) and user_agent[:255],
    )
    _set_refresh_cookie(
        response, token, max_age_seconds=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
async def register(
    request: Request, payload: UserCreate, db: AsyncSession = Depends(get_db)
) -> User:
    existing = await user_service.get_user_by_email_or_username(
        db, payload.email, payload.username
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Пользователь с таким email или именем уже существует",
        )
    return await user_service.create_user(db, payload)


@router.post("/login", response_model=AccessToken)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AccessToken:
    user = await user_service.authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
        )
    await _issue_refresh(db, response, user, request.headers.get("user-agent"))
    return AccessToken(access_token=create_access_token(str(user.id)))


@router.post("/refresh", response_model=AccessToken)
async def refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> AccessToken:
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh-токен не найден",
        )
    try:
        decoded = decode_token(raw, expected_type="refresh")
        jti = uuid.UUID(decoded["jti"])
        user_id = uuid.UUID(decoded["sub"])
    except (ValueError, KeyError):
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh-токен",
        )

    if not await refresh_token_service.is_active(db, jti):
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh-токен отозван",
        )

    user = await user_service.get_user_by_id(db, user_id)
    if user is None or not user.is_active:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Недействительный refresh-токен",
        )

    # Ротация: отзываем старый jti, выпускаем свежий refresh-токен + новый access.
    await refresh_token_service.revoke(db, jti)
    await _issue_refresh(db, response, user, request.headers.get("user-agent"))
    return AccessToken(access_token=create_access_token(str(user.id)))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> None:
    raw = request.cookies.get(REFRESH_COOKIE_NAME)
    if raw:
        try:
            decoded = decode_token(raw, expected_type="refresh")
            jti = uuid.UUID(decoded["jti"])
            await refresh_token_service.revoke(db, jti)
        except (ValueError, KeyError):
            pass
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
