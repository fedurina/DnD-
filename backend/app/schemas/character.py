import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

ABILITY_KEYS = {"str", "dex", "con", "int", "wis", "cha"}
STANDARD_ARRAY_SORTED = [8, 10, 12, 13, 14, 15]

ALIGNMENTS = {
    "lawful_good", "neutral_good", "chaotic_good",
    "lawful_neutral", "neutral", "chaotic_neutral",
    "lawful_evil", "neutral_evil", "chaotic_evil",
}


class CharacterCreate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=64)]
    alignment: str = "neutral"

    race_code: str
    class_code: str
    background_code: str

    ability_scores: dict[str, int]
    background_bonuses: dict[str, int]
    chosen_skills: list[str]

    @field_validator("alignment")
    @classmethod
    def _alignment(cls, v: str) -> str:
        if v not in ALIGNMENTS:
            raise ValueError("Unknown alignment")
        return v

    @field_validator("ability_scores")
    @classmethod
    def _ability_scores(cls, v: dict[str, int]) -> dict[str, int]:
        if set(v.keys()) != ABILITY_KEYS:
            raise ValueError("ability_scores must contain all 6 ability codes")
        if sorted(v.values()) != STANDARD_ARRAY_SORTED:
            raise ValueError(
                "ability_scores must be the Standard Array (15, 14, 13, 12, 10, 8)"
            )
        return v

    @field_validator("background_bonuses")
    @classmethod
    def _background_bonuses(cls, v: dict[str, int]) -> dict[str, int]:
        if not v:
            raise ValueError("background_bonuses required")
        if any(k not in ABILITY_KEYS for k in v.keys()):
            raise ValueError("Unknown ability in background_bonuses")
        if any(b < 1 or b > 2 for b in v.values()):
            raise ValueError("Each bonus must be 1 or 2")
        if sum(v.values()) != 3:
            raise ValueError("background_bonuses must sum to 3")
        # Either +1/+1/+1 (3 different abilities) or +2/+1 (2 different abilities).
        if sorted(v.values()) not in ([1, 1, 1], [1, 2]):
            raise ValueError("background_bonuses must be +1/+1/+1 or +2/+1")
        return v


class CharacterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    alignment: str
    level: int

    race_code: str
    class_code: str
    background_code: str

    ability_scores: dict[str, int]
    background_bonuses: dict[str, int]
    chosen_skills: list[str]
    is_archived: bool

    created_at: datetime
    updated_at: datetime


class CharacterSummary(BaseModel):
    """Lightweight projection for the list view."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    level: int
    race_code: str
    class_code: str
    background_code: str
    is_archived: bool
    created_at: datetime


class CharacterUpdate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=64)] | None = None
    alignment: str | None = None
    race_code: str | None = None
    class_code: str | None = None
    background_code: str | None = None
    ability_scores: dict[str, int] | None = None
    background_bonuses: dict[str, int] | None = None
    chosen_skills: list[str] | None = None

    @field_validator("alignment")
    @classmethod
    def _alignment(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in ALIGNMENTS:
            raise ValueError("Unknown alignment")
        return v

    @field_validator("ability_scores")
    @classmethod
    def _ability_scores(cls, v: dict[str, int] | None) -> dict[str, int] | None:
        if v is None:
            return v
        if set(v.keys()) != ABILITY_KEYS:
            raise ValueError("ability_scores must contain all 6 ability codes")
        if sorted(v.values()) != STANDARD_ARRAY_SORTED:
            raise ValueError(
                "ability_scores must be the Standard Array (15, 14, 13, 12, 10, 8)"
            )
        return v

    @field_validator("background_bonuses")
    @classmethod
    def _background_bonuses(cls, v: dict[str, int] | None) -> dict[str, int] | None:
        if v is None:
            return v
        if not v:
            raise ValueError("background_bonuses cannot be empty")
        if any(k not in ABILITY_KEYS for k in v.keys()):
            raise ValueError("Unknown ability in background_bonuses")
        if any(b < 1 or b > 2 for b in v.values()):
            raise ValueError("Each bonus must be 1 or 2")
        if sum(v.values()) != 3:
            raise ValueError("background_bonuses must sum to 3")
        if sorted(v.values()) not in ([1, 1, 1], [1, 2]):
            raise ValueError("background_bonuses must be +1/+1/+1 or +2/+1")
        return v
