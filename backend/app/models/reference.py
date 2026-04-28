from sqlalchemy import Integer, String, Text
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


class Background(Base):
    __tablename__ = "ref_backgrounds"

    code: Mapped[str] = mapped_column(String(32), primary_key=True)
    name_ru: Mapped[str] = mapped_column(String(64), nullable=False)
    description_ru: Mapped[str] = mapped_column(Text, nullable=False, default="")
    ability_scores: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    granted_skills: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    feat_ru: Mapped[str] = mapped_column(String(128), nullable=False, default="")
