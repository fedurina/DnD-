import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreate,
    CampaignDetail,
    CampaignJoinRequest,
    CampaignOut,
    CampaignSummary,
    CampaignUpdate,
    CharacterAttachRequest,
)
from app.services import campaign_service
from app.services.campaign_service import (
    CampaignNotFound,
    CampaignPermissionError,
    CampaignValidationError,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


def _handle(exc: Exception) -> HTTPException:
    if isinstance(exc, CampaignNotFound):
        return HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc) or "Кампания не найдена"
        )
    if isinstance(exc, CampaignPermissionError):
        return HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(exc) or "Недостаточно прав"
        )
    if isinstance(exc, CampaignValidationError):
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc) or "Некорректный запрос"
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Внутренняя ошибка сервера"
    )


@router.get("", response_model=dict[str, list[CampaignSummary]])
async def list_my_campaigns(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await campaign_service.list_for_user(db, current_user)


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    payload: CampaignCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await campaign_service.create_campaign(db, current_user, payload)
    except (CampaignPermissionError, CampaignValidationError) as exc:
        raise _handle(exc)


@router.get("/{campaign_id}", response_model=CampaignDetail)
async def get_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await campaign_service.get_detail(db, current_user, campaign_id)
    except (CampaignNotFound, CampaignPermissionError) as exc:
        raise _handle(exc)


@router.patch("/{campaign_id}", response_model=CampaignOut)
async def update_campaign(
    campaign_id: uuid.UUID,
    payload: CampaignUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await campaign_service.update_campaign(db, current_user, campaign_id, payload)
    except (CampaignNotFound, CampaignPermissionError) as exc:
        raise _handle(exc)


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await campaign_service.delete_campaign(db, current_user, campaign_id)
    except (CampaignNotFound, CampaignPermissionError) as exc:
        raise _handle(exc)


@router.post("/{campaign_id}/regenerate-invite", response_model=CampaignOut)
async def regenerate_invite(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await campaign_service.regenerate_invite(db, current_user, campaign_id)
    except (CampaignNotFound, CampaignPermissionError) as exc:
        raise _handle(exc)


@router.post("/join", response_model=CampaignOut)
async def join_by_code(
    payload: CampaignJoinRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await campaign_service.join_by_code(
            db, current_user, payload.invite_code, payload.character_id
        )
    except (CampaignNotFound, CampaignValidationError) as exc:
        raise _handle(exc)


@router.post("/{campaign_id}/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave(
    campaign_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await campaign_service.leave(db, current_user, campaign_id)
    except CampaignNotFound as exc:
        raise _handle(exc)


@router.patch("/{campaign_id}/character", status_code=status.HTTP_204_NO_CONTENT)
async def attach_character(
    campaign_id: uuid.UUID,
    payload: CharacterAttachRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await campaign_service.attach_character(
            db, current_user, campaign_id, payload.character_id
        )
    except (CampaignNotFound, CampaignValidationError) as exc:
        raise _handle(exc)


@router.delete(
    "/{campaign_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def kick_member(
    campaign_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        await campaign_service.kick(db, current_user, campaign_id, user_id)
    except (CampaignNotFound, CampaignPermissionError) as exc:
        raise _handle(exc)
