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

GENDERS = {"male", "female"}

EQUIP_CHOICES = {"set", "gold"}

LANGUAGE_CODES = {
    "common", "common_sign", "dwarvish", "elvish", "giant",
    "gnomish", "goblin", "halfling", "orcish", "draconic",
}
REQUIRED_LANGUAGE_COUNT = 3


def _validate_languages(v: list[str]) -> list[str]:
    if "common" not in v:
        raise ValueError("Общий язык должен быть в списке")
    if len(v) != REQUIRED_LANGUAGE_COUNT:
        raise ValueError(f"Нужно выбрать ровно {REQUIRED_LANGUAGE_COUNT} языка")
    if len(set(v)) != len(v):
        raise ValueError("Язык не может повторяться")
    invalid = set(v) - LANGUAGE_CODES
    if invalid:
        raise ValueError(f"Неизвестный язык: {sorted(invalid)}")
    return v


class InventoryEntry(BaseModel):
    code: str
    qty: int = Field(ge=1)


class CharacterCreate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=64)]
    alignment: str = "neutral"
    gender: str

    race_code: str
    class_code: str
    background_code: str

    ability_scores: dict[str, int]
    background_bonuses: dict[str, int]
    chosen_skills: list[str]
    languages: list[str]
    feats: list[str]
    items: list[InventoryEntry]
    gold: Annotated[int, Field(ge=0)] = 0
    equip_class_choice: str = "set"
    equip_bg_choice: str = "set"

    @field_validator("equip_class_choice", "equip_bg_choice")
    @classmethod
    def _equip_choice(cls, v: str) -> str:
        if v not in EQUIP_CHOICES:
            raise ValueError("Unknown equipment choice")
        return v

    @field_validator("alignment")
    @classmethod
    def _alignment(cls, v: str) -> str:
        if v not in ALIGNMENTS:
            raise ValueError("Unknown alignment")
        return v

    @field_validator("gender")
    @classmethod
    def _gender(cls, v: str) -> str:
        if v not in GENDERS:
            raise ValueError("Unknown gender")
        return v

    @field_validator("languages")
    @classmethod
    def _languages(cls, v: list[str]) -> list[str]:
        return _validate_languages(v)

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


class CharacterCampaignBrief(BaseModel):
    """Lightweight reference to a campaign the character is attached to."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    needs_attention: bool = False


class CharacterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    alignment: str
    level: int
    gender: str

    race_code: str
    class_code: str
    background_code: str

    ability_scores: dict[str, int]
    background_bonuses: dict[str, int]
    chosen_skills: list[str]
    languages: list[str]
    feats: list[str]
    items: list[InventoryEntry]
    gold: int
    equip_class_choice: str
    equip_bg_choice: str
    is_archived: bool
    campaigns: list[CharacterCampaignBrief] = []

    created_at: datetime
    updated_at: datetime


class CharacterSummary(BaseModel):
    """Lightweight projection for the list view."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    level: int
    gender: str
    race_code: str
    class_code: str
    background_code: str
    is_archived: bool
    campaigns: list[CharacterCampaignBrief] = []
    created_at: datetime


class CharacterUpdate(BaseModel):
    name: Annotated[str, Field(min_length=1, max_length=64)] | None = None
    alignment: str | None = None
    gender: str | None = None
    race_code: str | None = None
    class_code: str | None = None
    background_code: str | None = None
    ability_scores: dict[str, int] | None = None
    background_bonuses: dict[str, int] | None = None
    chosen_skills: list[str] | None = None
    languages: list[str] | None = None
    feats: list[str] | None = None
    items: list[InventoryEntry] | None = None
    gold: Annotated[int, Field(ge=0)] | None = None
    equip_class_choice: str | None = None
    equip_bg_choice: str | None = None

    @field_validator("equip_class_choice", "equip_bg_choice")
    @classmethod
    def _equip_choice_opt(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in EQUIP_CHOICES:
            raise ValueError("Unknown equipment choice")
        return v

    @field_validator("alignment")
    @classmethod
    def _alignment(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in ALIGNMENTS:
            raise ValueError("Unknown alignment")
        return v

    @field_validator("gender")
    @classmethod
    def _gender(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if v not in GENDERS:
            raise ValueError("Unknown gender")
        return v

    @field_validator("languages")
    @classmethod
    def _languages_opt(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        return _validate_languages(v)

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
