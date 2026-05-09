import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign, CampaignMember
from app.models.character import Character
from app.models.reference import (
    Background,
    CharacterClass,
    Feat,
    Item,
    Race,
    Subclass,
)
from app.models.user import User
from app.schemas.character import CharacterCreate, CharacterUpdate, InventoryEntry


class CharacterValidationError(ValueError):
    """Бросается, когда payload структурно валиден, но не соответствует доменным правилам."""


def _ability_modifier(score: int) -> int:
    return (score - 10) // 2


def _max_hp(hit_die: int, con_score: int, level: int) -> int:
    """Та же формула, что в frontend/src/lib/dnd.ts: максимум на 1 уровне +
    среднее (hit_die/2 + 1) за каждый последующий + модификатор Телосложения
    за каждый уровень."""
    con_mod = _ability_modifier(con_score)
    avg_per_level = hit_die // 2 + 1
    lvl = max(1, min(level, 20))
    return hit_die + con_mod + (lvl - 1) * (avg_per_level + con_mod)


def _final_con_score(ability_scores: dict, bonuses: dict) -> int:
    return int(ability_scores.get("con", 10)) + int(bonuses.get("con", 0))


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


async def _validate_feats(db: AsyncSession, feat_codes: list[str], bg: Background) -> None:
    if bg.feat_code and bg.feat_code not in feat_codes:
        bg_feat = await db.get(Feat, bg.feat_code)
        feat_label = bg_feat.name_ru if bg_feat else bg.feat_code
        raise CharacterValidationError(
            f"Черта предыстории «{feat_label}» должна быть в списке"
        )
    if len(set(feat_codes)) != len(feat_codes):
        raise CharacterValidationError("Черта не может повторяться")
    if not feat_codes:
        return
    rows = await db.execute(select(Feat.code).where(Feat.code.in_(feat_codes)))
    existing = {r[0] for r in rows.all()}
    missing = set(feat_codes) - existing
    if missing:
        raise CharacterValidationError(
            f"Неизвестные черты: {sorted(missing)}"
        )


async def _validate_items(db: AsyncSession, items: list[InventoryEntry]) -> None:
    if not items:
        return
    codes = [it.code for it in items]
    if len(set(codes)) != len(codes):
        raise CharacterValidationError("Один предмет встречается дважды — увеличьте qty")
    rows = await db.execute(select(Item.code).where(Item.code.in_(codes)))
    existing = {r[0] for r in rows.all()}
    missing = set(codes) - existing
    if missing:
        raise CharacterValidationError(
            f"Неизвестные предметы: {sorted(missing)}"
        )


async def _validate_subclass(
    db: AsyncSession,
    *,
    level: int,
    cls: CharacterClass,
    subclass_code: str | None,
) -> None:
    """С уровня class.subclass_start_level и выше подкласс обязателен и должен принадлежать классу."""
    requires = level >= cls.subclass_start_level
    if requires:
        if not subclass_code:
            raise CharacterValidationError(
                f"На уровне {level} нужно выбрать архетип класса «{cls.name_ru}»"
            )
        sub = await db.get(Subclass, subclass_code)
        if sub is None:
            raise CharacterValidationError(
                f"Архетип «{subclass_code}» не найден"
            )
        if sub.class_code != cls.code:
            raise CharacterValidationError(
                f"Архетип «{sub.name_ru}» не относится к классу «{cls.name_ru}»"
            )
    else:
        if subclass_code:
            raise CharacterValidationError(
                f"Архетип выбирается только с уровня {cls.subclass_start_level}"
            )


def _validate_bg_bonus_keys(bonuses: dict[str, int], bg: Background) -> None:
    valid = set(bg.ability_scores)
    invalid = set(bonuses) - valid
    if invalid:
        raise CharacterValidationError(
            f"Бонусы предыстории можно распределять только среди {sorted(valid)}; "
            f"недопустимо: {sorted(invalid)}"
        )
    # При раскладке +1/+1/+1 нужно задействовать все 3 указанные характеристики.
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
    await _validate_feats(db, payload.feats, bg)
    await _validate_items(db, payload.items)
    await _validate_subclass(
        db, level=payload.level, cls=cls, subclass_code=payload.subclass_code
    )

    char = Character(
        user_id=user.id,
        name=payload.name,
        alignment=payload.alignment,
        gender=payload.gender,
        level=payload.level,
        race_code=payload.race_code,
        class_code=payload.class_code,
        subclass_code=payload.subclass_code,
        background_code=payload.background_code,
        ability_scores=payload.ability_scores,
        background_bonuses=payload.background_bonuses,
        chosen_skills=payload.chosen_skills,
        languages=payload.languages,
        feats=payload.feats,
        items=[it.model_dump() for it in payload.items],
        gold=payload.gold,
        equip_class_choice=payload.equip_class_choice,
        equip_bg_choice=payload.equip_bg_choice,
        current_hp=payload.current_hp,
        temp_hp=payload.temp_hp,
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


def _character_mismatches(character: Character, campaign: Campaign) -> bool:
    """True, если прикреплённый персонаж больше не подходит под правила кампании.

    Зеркалирует campaign_service._character_mismatches_campaign — оставлено здесь,
    чтобы не импортировать приватный символ из соседнего модуля.
    """
    if character.is_archived:
        return True
    if character.level > campaign.max_level:
        return True
    if campaign.allowed_races and character.race_code not in campaign.allowed_races:
        return True
    if campaign.allowed_classes and character.class_code not in campaign.allowed_classes:
        return True
    return False


async def get_attached_campaigns_map(
    db: AsyncSession, characters: list[Character]
) -> dict[uuid.UUID, list[dict]]:
    """Для каждого персонажа возвращает список словарей прикреплённых кампаний с признаком needs_attention."""
    if not characters:
        return {}
    char_by_id = {c.id: c for c in characters}
    q = await db.execute(
        select(CampaignMember.character_id, Campaign)
        .join(Campaign, Campaign.id == CampaignMember.campaign_id)
        .where(CampaignMember.character_id.in_(list(char_by_id.keys())))
    )
    result: dict[uuid.UUID, list[dict]] = {cid: [] for cid in char_by_id}
    for char_id, campaign in q.all():
        char = char_by_id[char_id]
        result[char_id].append(
            {
                "id": campaign.id,
                "name": campaign.name,
                "needs_attention": _character_mismatches(char, campaign),
            }
        )
    return result


async def _is_master_of_campaign_with_character(
    db: AsyncSession, user: User, character_id: uuid.UUID
) -> bool:
    """True, если пользователь является мастером любой кампании, к которой сейчас прикреплён этот персонаж."""
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
    """Видимость: владелец ИЛИ мастер кампании, к которой прикреплён этот персонаж."""
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
    """Строгая проверка владельца, для операций «только владелец» (архивирование, удаление)."""
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

    # Вычисляем будущее состояние.
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
    new_level = payload.level if payload.level is not None else char.level

    # Проверяем, что справочные сущности существуют.
    race = await db.get(Race, new_race_code)
    if race is None:
        raise CharacterValidationError("Раса не найдена")
    cls = await db.get(CharacterClass, new_class_code)
    if cls is None:
        raise CharacterValidationError("Класс не найден")
    bg = await db.get(Background, new_bg_code)
    if bg is None:
        raise CharacterValidationError("Предыстория не найдена")

    # Подкласс: берём из payload, если он там; иначе если класс изменился — сбрасываем
    # предыдущий (он относился к старому классу); иначе наследуем текущий. После расчёта
    # автоматически сбрасываем, если новый уровень ниже class.subclass_start_level.
    class_changed = payload.class_code is not None and new_class_code != char.class_code
    if payload.subclass_code is not None:
        new_subclass_code: str | None = payload.subclass_code
    elif class_changed:
        new_subclass_code = None
    else:
        new_subclass_code = char.subclass_code
    if new_level < cls.subclass_start_level:
        new_subclass_code = None
    await _validate_subclass(
        db, level=new_level, cls=cls, subclass_code=new_subclass_code
    )

    # Прогоняем доменные валидаторы по будущему состоянию.
    _validate_skills(list(new_skills), cls, bg)
    _validate_bg_bonus_keys(dict(new_bonuses), bg)

    # Перепроверяем по каждой кампании, к которой персонаж сейчас прикреплён.
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
        if new_level > campaign.max_level:
            raise CharacterValidationError(
                f"Уровень {new_level} превышает лимит {campaign.max_level} "
                f"в кампании «{campaign.name}»"
            )

    # Если предыстория изменилась — проверяем, что черты всё ещё содержат
    # изначальную черту новой предыстории, даже если клиент не присылал новый
    # список черт.
    bg_changed = payload.background_code is not None and new_bg_code != char.background_code
    new_feats = list(payload.feats) if payload.feats is not None else list(char.feats)
    if payload.feats is not None or bg_changed:
        await _validate_feats(db, new_feats, bg)
    if payload.items is not None:
        await _validate_items(db, payload.items)

    # Применяем.
    if payload.name is not None:
        char.name = payload.name
    if payload.alignment is not None:
        char.alignment = payload.alignment
    if payload.gender is not None:
        char.gender = payload.gender
    if payload.languages is not None:
        char.languages = list(payload.languages)
    if payload.feats is not None:
        char.feats = list(payload.feats)
    if payload.items is not None:
        char.items = [it.model_dump() for it in payload.items]
    if payload.gold is not None:
        char.gold = payload.gold
    if payload.equip_class_choice is not None:
        char.equip_class_choice = payload.equip_class_choice
    if payload.equip_bg_choice is not None:
        char.equip_bg_choice = payload.equip_bg_choice
    char.race_code = new_race_code
    char.class_code = new_class_code
    char.subclass_code = new_subclass_code
    char.background_code = new_bg_code
    char.level = new_level
    char.ability_scores = dict(new_abilities)
    char.background_bonuses = dict(new_bonuses)
    char.chosen_skills = list(new_skills)

    # Хиты: явные значения из payload применяем, затем клампим current_hp
    # к новому максимуму, если уровень/класс/Телосложение изменились.
    if payload.current_hp is not None:
        char.current_hp = payload.current_hp
    if payload.temp_hp is not None:
        char.temp_hp = payload.temp_hp
    new_max = _max_hp(
        cls.hit_die,
        _final_con_score(char.ability_scores, char.background_bonuses),
        char.level,
    )
    if char.current_hp is not None and char.current_hp > new_max:
        char.current_hp = new_max

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
