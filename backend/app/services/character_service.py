import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.character import Character
from app.models.reference import Background, CharacterClass, Race
from app.models.user import User
from app.schemas.character import CharacterCreate, CharacterUpdate


class CharacterValidationError(ValueError):
    """Raised when payload is structurally valid but fails domain rules."""


async def _load_refs(
    db: AsyncSession, payload: CharacterCreate
) -> tuple[Race, CharacterClass, Background]:
    race = await db.get(Race, payload.race_code)
    if race is None:
        raise CharacterValidationError("Unknown race")
    cls = await db.get(CharacterClass, payload.class_code)
    if cls is None:
        raise CharacterValidationError("Unknown class")
    bg = await db.get(Background, payload.background_code)
    if bg is None:
        raise CharacterValidationError("Unknown background")
    return race, cls, bg


def _validate_skills(
    chosen: list[str], cls: CharacterClass, bg: Background
) -> None:
    if len(chosen) != cls.skill_choices_count:
        raise CharacterValidationError(
            f"Class requires exactly {cls.skill_choices_count} skill choices"
        )
    if len(set(chosen)) != len(chosen):
        raise CharacterValidationError("Duplicate skills not allowed")
    invalid = set(chosen) - set(cls.skill_options)
    if invalid:
        raise CharacterValidationError(
            f"Skills not in class options: {sorted(invalid)}"
        )
    overlap = set(chosen) & set(bg.granted_skills)
    if overlap:
        raise CharacterValidationError(
            f"Background already grants these skills: {sorted(overlap)}"
        )


def _validate_bg_bonus_keys(bonuses: dict[str, int], bg: Background) -> None:
    valid = set(bg.ability_scores)
    invalid = set(bonuses) - valid
    if invalid:
        raise CharacterValidationError(
            f"background_bonuses keys must be among {sorted(valid)}; got extras: {sorted(invalid)}"
        )
    # If +1/+1/+1, must use all 3 listed abilities.
    if sorted(bonuses.values()) == [1, 1, 1] and set(bonuses) != valid:
        raise CharacterValidationError(
            "+1/+1/+1 distribution must include all 3 background abilities"
        )


async def create_character(
    db: AsyncSession, user: User, payload: CharacterCreate
) -> Character:
    _race, cls, bg = await _load_refs(db, payload)
    _validate_skills(payload.chosen_skills, cls, bg)
    _validate_bg_bonus_keys(payload.background_bonuses, bg)

    char = Character(
        user_id=user.id,
        name=payload.name,
        alignment=payload.alignment,
        race_code=payload.race_code,
        class_code=payload.class_code,
        background_code=payload.background_code,
        ability_scores=payload.ability_scores,
        background_bonuses=payload.background_bonuses,
        chosen_skills=payload.chosen_skills,
    )
    db.add(char)
    await db.commit()
    await db.refresh(char)
    return char


async def list_characters(
    db: AsyncSession, user: User, *, include_archived: bool = False
) -> list[Character]:
    stmt = select(Character).where(Character.user_id == user.id)
    if not include_archived:
        stmt = stmt.where(Character.is_archived.is_(False))
    stmt = stmt.order_by(Character.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_character(
    db: AsyncSession, user: User, character_id: uuid.UUID
) -> Character | None:
    result = await db.execute(
        select(Character).where(
            Character.id == character_id, Character.user_id == user.id
        )
    )
    return result.scalar_one_or_none()


async def delete_character(
    db: AsyncSession, user: User, character_id: uuid.UUID
) -> bool:
    char = await get_character(db, user, character_id)
    if char is None:
        return False
    await db.delete(char)
    await db.commit()
    return True


async def update_character(
    db: AsyncSession, user: User, character_id: uuid.UUID, payload: CharacterUpdate
) -> Character | None:
    char = await get_character(db, user, character_id)
    if char is None:
        return None
    if payload.name is not None:
        char.name = payload.name
    if payload.alignment is not None:
        char.alignment = payload.alignment
    await db.commit()
    await db.refresh(char)
    return char


async def set_archived(
    db: AsyncSession, user: User, character_id: uuid.UUID, *, archived: bool
) -> Character | None:
    char = await get_character(db, user, character_id)
    if char is None:
        return None
    char.is_archived = archived
    await db.commit()
    await db.refresh(char)
    return char
