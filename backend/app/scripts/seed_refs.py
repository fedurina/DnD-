"""Seed/refresh D&D reference tables.

Idempotent UPSERT — existing rows are updated, new ones inserted, and rows in
the DB that aren't in the seed are deleted only if no character/subclass
references them. Run inside the backend container:

    docker compose exec backend python -m app.scripts.seed_refs
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.data.srd_55 import (
    ABILITIES,
    BACKGROUNDS,
    CLASSES,
    FEATS,
    ITEMS,
    RACES,
    SKILLS,
    SUBCLASSES,
)
from app.db.session import AsyncSessionLocal
from app.models.reference import (
    Ability,
    Background,
    CharacterClass,
    Feat,
    Item,
    Race,
    Skill,
    Subclass,
)


async def _upsert(db, model, rows: list[dict]) -> None:
    """INSERT ... ON CONFLICT (code) DO UPDATE — preserves existing rows referenced by FKs."""
    if not rows:
        return
    pk = "code"
    stmt = pg_insert(model.__table__).values(rows)
    update_cols = {c: stmt.excluded[c] for c in rows[0].keys() if c != pk}
    stmt = stmt.on_conflict_do_update(index_elements=[pk], set_=update_cols)
    await db.execute(stmt)


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        await _upsert(db, Ability, ABILITIES)
        await _upsert(db, Skill, SKILLS)
        await _upsert(db, Race, RACES)
        await _upsert(db, Feat, FEATS)
        await _upsert(db, Item, ITEMS)
        await _upsert(db, CharacterClass, CLASSES)
        await _upsert(db, Subclass, SUBCLASSES)
        await _upsert(db, Background, BACKGROUNDS)
        await db.commit()

    counts = {
        "abilities": len(ABILITIES),
        "skills": len(SKILLS),
        "races": len(RACES),
        "feats": len(FEATS),
        "items": len(ITEMS),
        "classes": len(CLASSES),
        "subclasses": len(SUBCLASSES),
        "backgrounds": len(BACKGROUNDS),
    }
    print("Seeded (upsert):", counts)


if __name__ == "__main__":
    asyncio.run(seed())
