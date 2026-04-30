import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign, CampaignMember
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
        raise CharacterValidationError("Раса не найдена")
    cls = await db.get(CharacterClass, payload.class_code)
    if cls is None:
        raise CharacterValidationError("Класс не найден")
    bg = await db.get(Background, payload.background_code)
    if bg is None:
        raise CharacterValidationError("Предыстория не найдена")
    return race, cls, bg


def _validate_skills(
    chosen: list[str], cls: CharacterClass, bg: Background
) -> None:
    if len(chosen) != cls.skill_choices_count:
        raise CharacterValidationError(
            f"Класс требует выбрать ровно {cls.skill_choices_count} навыков"
        )
    if len(set(chosen)) != len(chosen):
        raise CharacterValidationError("Нельзя выбрать один и тот же навык дважды")
    invalid = set(chosen) - set(cls.skill_options)
    if invalid:
        raise CharacterValidationError(
            f"Эти навыки недоступны для класса: {sorted(invalid)}"
        )
    overlap = set(chosen) & set(bg.granted_skills)
    if overlap:
        raise CharacterValidationError(
            f"Предыстория уже даёт эти навыки: {sorted(overlap)}"
        )


def _validate_bg_bonus_keys(bonuses: dict[str, int], bg: Background) -> None:
    valid = set(bg.ability_scores)
    invalid = set(bonuses) - valid
    if invalid:
        raise CharacterValidationError(
            f"Бонусы предыстории можно распределять только среди {sorted(valid)}; "
            f"недопустимо: {sorted(invalid)}"
        )
    # If +1/+1/+1, must use all 3 listed abilities.
    if sorted(bonuses.values()) == [1, 1, 1] and set(bonuses) != valid:
        raise CharacterValidationError(
            "Распределение +1/+1/+1 должно затрагивать все три характеристики предыстории"
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


async def _is_master_of_campaign_with_character(
    db: AsyncSession, user: User, character_id: uuid.UUID
) -> bool:
    """True if user masters any campaign where this character is currently attached."""
    result = await db.execute(
        select(Campaign.id)
        .join(CampaignMember, CampaignMember.campaign_id == Campaign.id)
        .where(
            Campaign.master_id == user.id,
            CampaignMember.character_id == character_id,
        )
    )
    return result.scalar_one_or_none() is not None


async def get_character(
    db: AsyncSession, user: User, character_id: uuid.UUID
) -> Character | None:
    """Visibility: owner OR master of a campaign that has the character attached."""
    char = await db.get(Character, character_id)
    if char is None:
        return None
    if char.user_id == user.id:
        return char
    if await _is_master_of_campaign_with_character(db, user, character_id):
        return char
    return None


async def _get_owned_character(
    db: AsyncSession, user: User, character_id: uuid.UUID
) -> Character | None:
    """Strict owner check, for owner-only operations (archive, delete)."""
    char = await db.get(Character, character_id)
    if char is None or char.user_id != user.id:
        return None
    return char


async def delete_character(
    db: AsyncSession, user: User, character_id: uuid.UUID
) -> bool:
    char = await _get_owned_character(db, user, character_id)
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

    # Compute future state.
    new_race_code = payload.race_code if payload.race_code is not None else char.race_code
    new_class_code = (
        payload.class_code if payload.class_code is not None else char.class_code
    )
    new_bg_code = (
        payload.background_code
        if payload.background_code is not None
        else char.background_code
    )
    new_abilities = (
        payload.ability_scores
        if payload.ability_scores is not None
        else char.ability_scores
    )
    new_bonuses = (
        payload.background_bonuses
        if payload.background_bonuses is not None
        else char.background_bonuses
    )
    new_skills = (
        payload.chosen_skills if payload.chosen_skills is not None else char.chosen_skills
    )

    # Validate refs exist.
    race = await db.get(Race, new_race_code)
    if race is None:
        raise CharacterValidationError("Раса не найдена")
    cls = await db.get(CharacterClass, new_class_code)
    if cls is None:
        raise CharacterValidationError("Класс не найден")
    bg = await db.get(Background, new_bg_code)
    if bg is None:
        raise CharacterValidationError("Предыстория не найдена")

    # Re-run domain validators on the future state.
    _validate_skills(list(new_skills), cls, bg)
    _validate_bg_bonus_keys(dict(new_bonuses), bg)

    # Re-validate against every campaign the character is currently attached to.
    memberships = await db.execute(
        select(Campaign)
        .join(CampaignMember, CampaignMember.campaign_id == Campaign.id)
        .where(CampaignMember.character_id == char.id)
    )
    for campaign in memberships.scalars().all():
        if campaign.allowed_races and new_race_code not in campaign.allowed_races:
            raise CharacterValidationError(
                f"Раса «{race.name_ru}» не разрешена в кампании «{campaign.name}»"
            )
        if campaign.allowed_classes and new_class_code not in campaign.allowed_classes:
            raise CharacterValidationError(
                f"Класс «{cls.name_ru}» не разрешён в кампании «{campaign.name}»"
            )
        if char.level > campaign.max_level:
            raise CharacterValidationError(
                f"Уровень {char.level} превышает лимит {campaign.max_level} "
                f"в кампании «{campaign.name}»"
            )

    # Apply.
    if payload.name is not None:
        char.name = payload.name
    if payload.alignment is not None:
        char.alignment = payload.alignment
    char.race_code = new_race_code
    char.class_code = new_class_code
    char.background_code = new_bg_code
    char.ability_scores = dict(new_abilities)
    char.background_bonuses = dict(new_bonuses)
    char.chosen_skills = list(new_skills)

    await db.commit()
    await db.refresh(char)
    return char


async def set_archived(
    db: AsyncSession, user: User, character_id: uuid.UUID, *, archived: bool
) -> Character | None:
    char = await _get_owned_character(db, user, character_id)
    if char is None:
        return None
    char.is_archived = archived
    await db.commit()
    await db.refresh(char)
    return char
