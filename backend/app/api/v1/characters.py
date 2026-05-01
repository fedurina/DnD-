import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.deps import get_current_user
from app.db.session import get_db
from app.models.character import Character
from app.models.user import User
from app.schemas.character import (
    CharacterCreate,
    CharacterOut,
    CharacterSummary,
    CharacterUpdate,
)
from app.services import character_service
from app.services.character_service import CharacterValidationError

router = APIRouter(prefix="/characters", tags=["characters"])


async def _attach_campaigns(db: AsyncSession, characters: list[Character]) -> None:
    """Mutate each character with a `.campaigns` attribute (list of dicts) so
    response_model=CharacterOut/Summary can serialize it via from_attributes."""
    if not characters:
        return
    campaigns_map = await character_service.get_attached_campaigns_map(db, characters)
    for c in characters:
        c.campaigns = campaigns_map.get(c.id, [])


@router.get("", response_model=list[CharacterSummary])
async def list_characters(
    include_archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chars = await character_service.list_characters(
        db, current_user, include_archived=include_archived
    )
    await _attach_campaigns(db, chars)
    return chars


@router.post("", response_model=CharacterOut, status_code=status.HTTP_201_CREATED)
async def create_character(
    payload: CharacterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        char = await character_service.create_character(db, current_user, payload)
    except CharacterValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    char.campaigns = []  # newly created — not attached to anything yet
    return char


@router.get("/{character_id}", response_model=CharacterOut)
async def get_character(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    char = await character_service.get_character(db, current_user, character_id)
    if char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")
    await _attach_campaigns(db, [char])
    return char


@router.patch("/{character_id}", response_model=CharacterOut)
async def update_character(
    character_id: uuid.UUID,
    payload: CharacterUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        char = await character_service.update_character(
            db, current_user, character_id, payload
        )
    except CharacterValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")
    await _attach_campaigns(db, [char])
    return char


@router.post("/{character_id}/archive", response_model=CharacterOut)
async def archive_character(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    char = await character_service.set_archived(
        db, current_user, character_id, archived=True
    )
    if char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")
    await _attach_campaigns(db, [char])
    return char


@router.post("/{character_id}/unarchive", response_model=CharacterOut)
async def unarchive_character(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    char = await character_service.set_archived(
        db, current_user, character_id, archived=False
    )
    if char is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")
    await _attach_campaigns(db, [char])
    return char


@router.delete("/{character_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_character(
    character_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ok = await character_service.delete_character(db, current_user, character_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Персонаж не найден")
