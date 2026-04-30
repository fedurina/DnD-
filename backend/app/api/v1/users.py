from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import PasswordChange, UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserOut)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    if payload.email is None and payload.username is None:
        return current_user

    taken = await user_service.is_taken(
        db,
        email=payload.email if payload.email != current_user.email else None,
        username=payload.username if payload.username != current_user.username else None,
        exclude_id=current_user.id,
    )
    if taken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email или имя пользователя уже заняты",
        )

    return await user_service.update_user(
        db, current_user, email=payload.email, username=payload.username
    )


@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    ok = await user_service.change_password(
        db, current_user, payload.current_password, payload.new_password
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Текущий пароль неверен",
        )
