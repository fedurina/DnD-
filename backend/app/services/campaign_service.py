import secrets
import string
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign, CampaignMember
from app.models.character import Character
from app.models.reference import CharacterClass, Race
from app.models.user import User, UserRole
from app.schemas.campaign import CampaignCreate, CampaignUpdate

INVITE_ALPHABET = string.ascii_uppercase + string.digits  # no lowercase, easier to share aloud


class CampaignError(Exception):
    """Base for campaign service domain errors."""


class CampaignPermissionError(CampaignError):
    pass


class CampaignNotFound(CampaignError):
    pass


class CampaignValidationError(CampaignError):
    pass


def _generate_invite_code(length: int = 8) -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(length))


def _character_mismatches_campaign(
    character: Character | None, campaign: Campaign
) -> bool:
    """True if the attached character no longer fits the (possibly updated) campaign rules."""
    if character is None:
        return False
    if character.is_archived:
        return True
    if character.level > campaign.max_level:
        return True
    if campaign.allowed_races and character.race_code not in campaign.allowed_races:
        return True
    if campaign.allowed_classes and character.class_code not in campaign.allowed_classes:
        return True
    return False


async def _allocate_invite_code(db: AsyncSession) -> str:
    for _ in range(10):
        code = _generate_invite_code()
        existing = await db.execute(select(Campaign).where(Campaign.invite_code == code))
        if existing.scalar_one_or_none() is None:
            return code
    raise CampaignError("Не удалось сгенерировать уникальный код приглашения")


# ---------- Create / Update / Delete ----------

async def create_campaign(
    db: AsyncSession, master: User, payload: CampaignCreate
) -> Campaign:
    if master.role != UserRole.MASTER:
        raise CampaignPermissionError("Создавать кампании может только мастер")

    code = await _allocate_invite_code(db)
    campaign = Campaign(
        master_id=master.id,
        name=payload.name,
        description=payload.description,
        invite_code=code,
        allowed_races=payload.allowed_races,
        allowed_classes=payload.allowed_classes,
        max_level=payload.max_level,
        is_active=True,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


async def update_campaign(
    db: AsyncSession, user: User, campaign_id: uuid.UUID, payload: CampaignUpdate
) -> Campaign:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise CampaignNotFound()
    if campaign.master_id != user.id:
        raise CampaignPermissionError()

    for field in ("name", "description", "allowed_races", "allowed_classes", "max_level", "is_active"):
        value = getattr(payload, field)
        if value is not None:
            setattr(campaign, field, value)

    await db.commit()
    await db.refresh(campaign)
    return campaign


async def delete_campaign(db: AsyncSession, user: User, campaign_id: uuid.UUID) -> None:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise CampaignNotFound()
    if campaign.master_id != user.id:
        raise CampaignPermissionError()
    await db.delete(campaign)
    await db.commit()


async def regenerate_invite(db: AsyncSession, user: User, campaign_id: uuid.UUID) -> Campaign:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise CampaignNotFound()
    if campaign.master_id != user.id:
        raise CampaignPermissionError()
    campaign.invite_code = await _allocate_invite_code(db)
    await db.commit()
    await db.refresh(campaign)
    return campaign


# ---------- List / Detail ----------

async def list_for_user(db: AsyncSession, user: User) -> dict[str, list]:
    """Return owned + joined campaigns as lightweight summaries."""
    owned_q = await db.execute(
        select(Campaign, User.username)
        .join(User, User.id == Campaign.master_id)
        .where(Campaign.master_id == user.id)
        .order_by(Campaign.created_at.desc())
    )
    owned_rows = owned_q.all()

    joined_q = await db.execute(
        select(Campaign, User.username, CampaignMember.character_id, Character)
        .join(User, User.id == Campaign.master_id)
        .join(CampaignMember, CampaignMember.campaign_id == Campaign.id)
        .outerjoin(Character, Character.id == CampaignMember.character_id)
        .where(CampaignMember.user_id == user.id)
        .order_by(Campaign.created_at.desc())
    )
    joined_rows = joined_q.all()

    counts_q = await db.execute(
        select(CampaignMember.campaign_id, func.count(CampaignMember.user_id))
        .group_by(CampaignMember.campaign_id)
    )
    counts = {row[0]: row[1] for row in counts_q.all()}

    # For owned campaigns: needs_attention = at least one member's character mismatches.
    owned_ids = [c.id for c, _ in owned_rows]
    owned_attention: dict[uuid.UUID, bool] = {cid: False for cid in owned_ids}
    if owned_ids:
        member_chars_q = await db.execute(
            select(CampaignMember.campaign_id, Character)
            .outerjoin(Character, Character.id == CampaignMember.character_id)
            .where(CampaignMember.campaign_id.in_(owned_ids))
        )
        owned_by_id = {c.id: c for c, _ in owned_rows}
        for cid, character in member_chars_q.all():
            if owned_attention[cid]:
                continue
            if _character_mismatches_campaign(character, owned_by_id[cid]):
                owned_attention[cid] = True

    def to_owned(c: Campaign, master_username: str) -> dict:
        return {
            "id": c.id,
            "master_id": c.master_id,
            "master_username": master_username,
            "name": c.name,
            "max_level": c.max_level,
            "is_active": c.is_active,
            "member_count": counts.get(c.id, 0),
            "my_character_id": None,
            "needs_attention": owned_attention.get(c.id, False),
            "created_at": c.created_at,
        }

    def to_joined(
        c: Campaign,
        master_username: str,
        my_char_id,
        my_character: Character | None,
    ) -> dict:
        return {
            "id": c.id,
            "master_id": c.master_id,
            "master_username": master_username,
            "name": c.name,
            "max_level": c.max_level,
            "is_active": c.is_active,
            "member_count": counts.get(c.id, 0),
            "my_character_id": my_char_id,
            "needs_attention": _character_mismatches_campaign(my_character, c),
            "created_at": c.created_at,
        }

    return {
        "owned": [to_owned(c, u) for (c, u) in owned_rows],
        "joined": [to_joined(c, u, ch_id, ch) for (c, u, ch_id, ch) in joined_rows],
    }


async def get_detail(
    db: AsyncSession, user: User, campaign_id: uuid.UUID
) -> dict:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise CampaignNotFound()

    is_master = campaign.master_id == user.id

    # Membership check (only members or master can view)
    member_q = await db.execute(
        select(CampaignMember).where(
            CampaignMember.campaign_id == campaign_id,
            CampaignMember.user_id == user.id,
        )
    )
    is_member = member_q.scalar_one_or_none() is not None

    if not (is_master or is_member):
        raise CampaignPermissionError()

    master_q = await db.execute(select(User.username).where(User.id == campaign.master_id))
    master_username = master_q.scalar_one()

    members_q = await db.execute(
        select(CampaignMember, User.username, Character)
        .join(User, User.id == CampaignMember.user_id)
        .outerjoin(Character, Character.id == CampaignMember.character_id)
        .where(CampaignMember.campaign_id == campaign_id)
        .order_by(CampaignMember.joined_at.asc())
    )
    members = []
    for member, username, character in members_q.all():
        members.append(
            {
                "user_id": member.user_id,
                "username": username,
                "character_id": member.character_id,
                "character_name": character.name if character is not None else None,
                "needs_attention": _character_mismatches_campaign(character, campaign),
                "joined_at": member.joined_at,
            }
        )

    return {
        "id": campaign.id,
        "master_id": campaign.master_id,
        "master_username": master_username,
        "name": campaign.name,
        "description": campaign.description,
        "invite_code": campaign.invite_code if is_master else "",
        "allowed_races": campaign.allowed_races,
        "allowed_classes": campaign.allowed_classes,
        "max_level": campaign.max_level,
        "is_active": campaign.is_active,
        "members": members,
        "created_at": campaign.created_at,
        "updated_at": campaign.updated_at,
    }


# ---------- Membership ----------

async def join_by_code(
    db: AsyncSession, user: User, invite_code: str, character_id: uuid.UUID | None
) -> Campaign:
    q = await db.execute(select(Campaign).where(Campaign.invite_code == invite_code))
    campaign = q.scalar_one_or_none()
    if campaign is None:
        raise CampaignNotFound("Неверный код приглашения")
    if campaign.master_id == user.id:
        raise CampaignValidationError("Мастер не может вступить в свою кампанию как игрок")
    if not campaign.is_active:
        raise CampaignValidationError("Кампания не активна")

    existing = await db.execute(
        select(CampaignMember).where(
            CampaignMember.campaign_id == campaign.id,
            CampaignMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise CampaignValidationError("Вы уже состоите в этой кампании")

    if character_id is not None:
        await _validate_character_for_campaign(db, user, character_id, campaign)

    member = CampaignMember(
        campaign_id=campaign.id, user_id=user.id, character_id=character_id
    )
    db.add(member)
    await db.commit()
    return campaign


async def leave(db: AsyncSession, user: User, campaign_id: uuid.UUID) -> None:
    q = await db.execute(
        select(CampaignMember).where(
            CampaignMember.campaign_id == campaign_id,
            CampaignMember.user_id == user.id,
        )
    )
    member = q.scalar_one_or_none()
    if member is None:
        raise CampaignNotFound("Вы не состоите в этой кампании")
    await db.delete(member)
    await db.commit()


async def kick(
    db: AsyncSession, master: User, campaign_id: uuid.UUID, user_id: uuid.UUID
) -> None:
    campaign = await db.get(Campaign, campaign_id)
    if campaign is None:
        raise CampaignNotFound()
    if campaign.master_id != master.id:
        raise CampaignPermissionError()

    q = await db.execute(
        select(CampaignMember).where(
            CampaignMember.campaign_id == campaign_id,
            CampaignMember.user_id == user_id,
        )
    )
    member = q.scalar_one_or_none()
    if member is None:
        raise CampaignNotFound("Участник не найден")
    await db.delete(member)
    await db.commit()


async def attach_character(
    db: AsyncSession,
    user: User,
    campaign_id: uuid.UUID,
    character_id: uuid.UUID | None,
) -> None:
    q = await db.execute(
        select(CampaignMember).where(
            CampaignMember.campaign_id == campaign_id,
            CampaignMember.user_id == user.id,
        )
    )
    member = q.scalar_one_or_none()
    if member is None:
        raise CampaignNotFound("Вы не состоите в этой кампании")

    if character_id is not None:
        campaign = await db.get(Campaign, campaign_id)
        await _validate_character_for_campaign(db, user, character_id, campaign)

    member.character_id = character_id
    await db.commit()


async def _validate_character_for_campaign(
    db: AsyncSession, user: User, character_id: uuid.UUID, campaign: Campaign
) -> None:
    char = await db.get(Character, character_id)
    if char is None or char.user_id != user.id:
        raise CampaignValidationError("Персонаж не найден")
    if char.is_archived:
        raise CampaignValidationError("Персонаж в архиве")
    if char.level > campaign.max_level:
        raise CampaignValidationError(
            f"Уровень персонажа ({char.level}) превышает лимит кампании ({campaign.max_level})"
        )
    if campaign.allowed_races and char.race_code not in campaign.allowed_races:
        race = await db.get(Race, char.race_code)
        race_name = race.name_ru if race else char.race_code
        raise CampaignValidationError(
            f"Раса «{race_name}» не разрешена в этой кампании"
        )
    if campaign.allowed_classes and char.class_code not in campaign.allowed_classes:
        cls = await db.get(CharacterClass, char.class_code)
        class_name = cls.name_ru if cls else char.class_code
        raise CampaignValidationError(
            f"Класс «{class_name}» не разрешён в этой кампании"
        )
