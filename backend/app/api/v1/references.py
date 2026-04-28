from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.reference import (
    Ability,
    Background,
    CharacterClass,
    Race,
    Skill,
)
from app.schemas.reference import (
    AbilityOut,
    BackgroundOut,
    ClassOut,
    RaceOut,
    SkillOut,
)

router = APIRouter(prefix="/refs", tags=["references"])


@router.get("/abilities", response_model=list[AbilityOut])
async def list_abilities(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Ability).order_by(Ability.code))
    return result.scalars().all()


@router.get("/skills", response_model=list[SkillOut])
async def list_skills(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Skill).order_by(Skill.name_ru))
    return result.scalars().all()


@router.get("/races", response_model=list[RaceOut])
async def list_races(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Race).order_by(Race.name_ru))
    return result.scalars().all()


@router.get("/races/{code}", response_model=RaceOut)
async def get_race(code: str, db: AsyncSession = Depends(get_db)):
    race = await db.get(Race, code)
    if race is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Race not found")
    return race


@router.get("/classes", response_model=list[ClassOut])
async def list_classes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CharacterClass).order_by(CharacterClass.name_ru))
    return result.scalars().all()


@router.get("/classes/{code}", response_model=ClassOut)
async def get_class(code: str, db: AsyncSession = Depends(get_db)):
    obj = await db.get(CharacterClass, code)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    return obj


@router.get("/backgrounds", response_model=list[BackgroundOut])
async def list_backgrounds(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Background).order_by(Background.name_ru))
    return result.scalars().all()


@router.get("/backgrounds/{code}", response_model=BackgroundOut)
async def get_background(code: str, db: AsyncSession = Depends(get_db)):
    obj = await db.get(Background, code)
    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Background not found")
    return obj
