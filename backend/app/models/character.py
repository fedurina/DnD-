import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, Integer, String, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(64), nullable=False)
    alignment: Mapped[str] = mapped_column(String(32), nullable=False, default="neutral")
    level: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    gender: Mapped[str] = mapped_column(String(16), nullable=False)

    race_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("ref_races.code", ondelete="RESTRICT"), nullable=False
    )
    class_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("ref_classes.code", ondelete="RESTRICT"), nullable=False
    )
    subclass_code: Mapped[str | None] = mapped_column(
        String(48),
        ForeignKey("ref_subclasses.code", ondelete="RESTRICT"),
        nullable=True,
    )
    background_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("ref_backgrounds.code", ondelete="RESTRICT"), nullable=False
    )

    # Значения Standard Array, ключи — коды характеристик (str/dex/con/int/wis/cha).
    ability_scores: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Подмножество background.ability_scores, например {"str": 2, "con": 1}.
    background_bonuses: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Навыки, выбранные из class.skill_options (навыки от предыстории идут автоматом и здесь не хранятся).
    chosen_skills: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Коды языков (например, ["common", "elvish", "draconic"]). Common всегда в списке.
    languages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Коды черт (изначальная черта от предыстории всегда в списке).
    feats: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Снимок инвентаря на момент создания: [{"code": "leather_armor", "qty": 1}, ...]
    items: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Золотые монеты.
    gold: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Флаги выбора снаряжения ("set" или "gold") — определяют, как считаются предметы и золото.
    equip_class_choice: Mapped[str] = mapped_column(String(8), nullable=False, default="set")
    equip_bg_choice: Mapped[str] = mapped_column(String(8), nullable=False, default="set")

    is_archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
