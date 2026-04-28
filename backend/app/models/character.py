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

    race_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("ref_races.code", ondelete="RESTRICT"), nullable=False
    )
    class_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("ref_classes.code", ondelete="RESTRICT"), nullable=False
    )
    background_code: Mapped[str] = mapped_column(
        String(32), ForeignKey("ref_backgrounds.code", ondelete="RESTRICT"), nullable=False
    )

    # Standard Array values keyed by ability code (str/dex/con/int/wis/cha)
    ability_scores: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Subset of background.ability_scores: e.g. {"str": 2, "con": 1}
    background_bonuses: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Skills picked from class.skill_options (background skills are auto, not stored here)
    chosen_skills: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

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
