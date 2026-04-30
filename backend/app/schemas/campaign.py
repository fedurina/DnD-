import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CampaignCreate(BaseModel):
    name: Annotated[str, Field(min_length=3, max_length=120)]
    description: str = ""
    allowed_races: list[str] = []
    allowed_classes: list[str] = []
    max_level: Annotated[int, Field(ge=1, le=20)] = 20

    @field_validator("allowed_races", "allowed_classes")
    @classmethod
    def _unique_codes(cls, v: list[str]) -> list[str]:
        if len(v) != len(set(v)):
            raise ValueError("Codes must be unique")
        return v


class CampaignUpdate(BaseModel):
    name: Annotated[str, Field(min_length=3, max_length=120)] | None = None
    description: str | None = None
    allowed_races: list[str] | None = None
    allowed_classes: list[str] | None = None
    max_level: Annotated[int, Field(ge=1, le=20)] | None = None
    is_active: bool | None = None


class CampaignOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    master_id: uuid.UUID
    name: str
    description: str
    invite_code: str
    allowed_races: list[str]
    allowed_classes: list[str]
    max_level: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CampaignMemberOut(BaseModel):
    user_id: uuid.UUID
    username: str
    character_id: uuid.UUID | None
    character_name: str | None
    needs_attention: bool = False
    joined_at: datetime


class CampaignDetail(CampaignOut):
    master_username: str
    members: list[CampaignMemberOut]


class CampaignSummary(BaseModel):
    """List view: lightweight projection."""

    id: uuid.UUID
    master_id: uuid.UUID
    master_username: str
    name: str
    max_level: int
    is_active: bool
    member_count: int
    my_character_id: uuid.UUID | None = None
    # For owned campaigns: at least one member's character mismatches restrictions.
    # For joined campaigns: my own attached character mismatches.
    needs_attention: bool = False
    created_at: datetime


class CampaignJoinRequest(BaseModel):
    invite_code: Annotated[str, Field(min_length=4, max_length=16)]
    character_id: uuid.UUID | None = None


class CharacterAttachRequest(BaseModel):
    character_id: uuid.UUID | None  # None = detach
