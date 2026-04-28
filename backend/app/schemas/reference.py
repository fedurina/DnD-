from pydantic import BaseModel, ConfigDict


class _Base(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class AbilityOut(_Base):
    code: str
    name_ru: str
    short_ru: str


class SkillOut(_Base):
    code: str
    name_ru: str
    ability_code: str


class RaceTrait(BaseModel):
    name_ru: str
    description_ru: str


class RaceOut(_Base):
    code: str
    name_ru: str
    description_ru: str
    size: str
    speed: int
    traits: list[RaceTrait]


class ClassOut(_Base):
    code: str
    name_ru: str
    description_ru: str
    hit_die: int
    primary_abilities: list[str]
    saving_throw_abilities: list[str]
    skill_choices_count: int
    skill_options: list[str]


class BackgroundOut(_Base):
    code: str
    name_ru: str
    description_ru: str
    ability_scores: list[str]
    granted_skills: list[str]
    feat_ru: str
