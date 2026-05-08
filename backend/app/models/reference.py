from sqlalchemy import Boolean, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Ability(Base):
    """The six core ability scores: STR, DEX, CON, INT, WIS, CHA."""

    __tablename__ = "ref_abilities"

    code: Mapped[str] = mapped_column(String(8), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(64), nullable=False)
    short_ru: Mapped[str] = mapped_column(String(8), nullable=False)


class Skill(Base):
    __tablename__ = "ref_skills"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(64), nullable=False)
    ability_code: Mapped[str] = mapped_column(String(8), nullable=False)


class Race(Base):
    __tablename__ = "ref_races"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(64), nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False, default="")
    size: Mapped[str] = mapped_column(String(16), nullable=False)
    speed: Mapped[int] = mapped_column(Integer, nullable=False)
    traits: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)


class CharacterClass(Base):
    __tablename__ = "ref_classes"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(64), nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False, default="")
    hit_die: Mapped[int] = mapped_column(Integer, nullable=False)
    primary_abilities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    saving_throw_abilities: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    skill_choices_count: Mapped[int] = mapped_column(Integer, nullable=False, default=2)
    skill_options: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # [{"code": "leather_armor", "qty": 1}, ...]
    starting_equipment: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # Alternative starting gold (in gp), if the player skips the standard set.
    starting_gold_alt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Level at which the player must pick a subclass (2024: level 3 for all classes).
    subclass_start_level: Mapped[int] = mapped_column(Integer, nullable=False, default=3)


class Subclass(Base):
    __tablename__ = "ref_subclasses"

    code: Mapped[str] = mapped_column(String(48), primary_key=True)
    class_code: Mapped[str] = mapped_column(
        String(32), nullable=False, index=True
    )
    name_ru: Mapped[str] = mapped_column(String(96), nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False, default="")


class Background(Base):
    __tablename__ = "ref_backgrounds"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(64), nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ability_scores: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    granted_skills: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    # FK-by-convention to ref_feats.code (origin feat granted by background).
    feat_code: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    starting_equipment: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    starting_gold_alt: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Feat(Base):
    __tablename__ = "ref_feats"

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(96), nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # 'origin' | 'general' | 'fighting_style'
    category: Mapped[str] = mapped_column(String(24), nullable=False)
    prerequisites_ru: Mapped[str | None] = mapped_column(String(256), nullable=True)
    is_repeatable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class Item(Base):
    __tablename__ = "ref_items"

    code: Mapped[str] = mapped_column(String(64), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(96), nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False, default="")
    # 'weapon' | 'armor' | 'ammunition' | 'gear' | 'kit' | 'tool' | 'currency'
    type: Mapped[str] = mapped_column(String(24), nullable=False)
    # Cost in gold pieces (decimal — so 1 sp = 0.1 gp).
    cost_gp: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
