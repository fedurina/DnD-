import secrets
import string
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign, CampaignMember
from app.models.character import Character
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


async def _allocate_invite_code(db: AsyncSession) -> str:
    for _ in range(10):
        code = _generate_invite_code()
        existing = await db.execute(select(Campaign).where(Campaign.invite_code == code))
        if existing.scalar_one_or_none() is None:
            return code
    raise CampaignError("Failed to allocate unique invite code")


# ---------- Create / Update / Delete ----------

async def create_campaign(
    db: AsyncSession, master: User, payload: CampaignCreate
) -> Campaign:
    if master.role != UserRole.MASTER:
        raise CampaignPermissionError("Only masters can create campaigns")

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
    # Owned
    owned_q = await db.execute(
        select(Campaign, User.username)
        .join(User, User.id == Campaign.master_id)
        .where(Campaign.master_id == user.id)
        .order_by(Campaign.created_at.desc())
    )
    owned_rows = owned_q.all()

    # Joined: campaigns where user is a member
    joined_q = await db.execute(
        select(Campaign, User.username, CampaignMember.character_id)
        .join(User, User.id == Campaign.master_id)
        .join(CampaignMember, CampaignMember.campaign_id == Campaign.id)
        .where(CampaignMember.user_id == user.id)
        .order_by(Campaign.created_at.desc())
    )
    joined_rows = joined_q.all()

    # Member counts (one query)
    counts_q = await db.execute(
        select(CampaignMember.campaign_id, func.count(CampaignMember.user_id))
        .group_by(CampaignMember.campaign_id)
    )
    counts = {row[0]: row[1] for row in counts_q.all()}

    def to_summary(c: Campaign, master_username: str, my_char_id=None) -> dict:
        return {
            "id": c.id,
            "master_id": c.master_id,
            "master_username": master_username,
            "name": c.name,
            "max_level": c.max_level,
            "is_active": c.is_active,
            "member_count": counts.get(c.id, 0),
            "my_character_id": my_char_id,
            "created_at": c.created_at,
        }

    return {
        "owned": [to_summary(c, u) for (c, u) in owned_rows],
        "joined": [to_summary(c, u, ch) for (c, u, ch) in joined_rows],
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
        select(
            CampaignMember.user_id,
            User.username,
            CampaignMember.character_id,
            Character.name,
            CampaignMember.joined_at,
        )
        .join(User, User.id == CampaignMember.user_id)
        .outerjoin(Character, Character.id == CampaignMember.character_id)
        .where(CampaignMember.campaign_id == campaign_id)
        .order_by(CampaignMember.joined_at.asc())
    )
    members = [
        {
            "user_id": row[0],
            "username": row[1],
            "character_id": row[2],
            "character_name": row[3],
            "joined_at": row[4],
        }
        for row in members_q.all()
    ]

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
        raise CampaignNotFound("Invalid invite code")
    if campaign.master_id == user.id:
        raise CampaignValidationError("Master cannot join their own campaign as a player")
    if not campaign.is_active:
        raise CampaignValidationError("Campaign is not active")

    existing = await db.execute(
        select(CampaignMember).where(
            CampaignMember.campaign_id == campaign.id,
            CampaignMember.user_id == user.id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise CampaignValidationError("Already a member of this campaign")

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
        raise CampaignNotFound("You are not a member of this campaign")
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
        raise CampaignNotFound("Member not found")
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
        raise CampaignNotFound("You are not a member of this campaign")

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
        raise CampaignValidationError("Character not found")
    if char.is_archived:
        raise CampaignValidationError("Character is archived")
    if char.level > campaign.max_level:
        raise CampaignValidationError(
            f"Character level {char.level} exceeds campaign limit {campaign.max_level}"
        )
    if campaign.allowed_races and char.race_code not in campaign.allowed_races:
        raise CampaignValidationError(
            f"Race '{char.race_code}' is not allowed in this campaign"
        )
    if campaign.allowed_classes and char.class_code not in campaign.allowed_classes:
        raise CampaignValidationError(
            f"Class '{char.class_code}' is not allowed in this campaign"
        )
