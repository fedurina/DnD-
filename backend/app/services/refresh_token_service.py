import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.refresh_token import RefreshToken


async def store(
    db: AsyncSession,
    *,
    jti: uuid.UUID,
    user_id: uuid.UUID,
    expires_at: datetime,
    user_agent: str | None = None,
) -> None:
    db.add(
        RefreshToken(
            jti=jti, user_id=user_id, expires_at=expires_at, user_agent=user_agent
        )
    )
    await db.commit()


async def is_active(db: AsyncSession, jti: uuid.UUID) -> bool:
    result = await db.execute(select(RefreshToken).where(RefreshToken.jti == jti))
    row = result.scalar_one_or_none()
    if row is None or row.revoked_at is not None:
        return False
    if row.expires_at <= datetime.now(timezone.utc):
        return False
    return True


async def revoke(db: AsyncSession, jti: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.jti == jti, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    await db.commit()


async def revoke_all_for_user(db: AsyncSession, user_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=datetime.now(timezone.utc))
    )
    await db.commit()
