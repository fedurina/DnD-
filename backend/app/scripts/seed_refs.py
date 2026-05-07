"""Seed/refresh D&D reference tables.

Idempotent: deletes existing rows in the reference tables and re-inserts.
Run inside the backend container:

    docker compose exec backend python -m app.scripts.seed_refs
"""

import asyncio

from sqlalchemy import delete

from app.data.srd_55 import (
    ABILITIES,
    BACKGROUNDS,
    CLASSES,
    FEATS,
    ITEMS,
    RACES,
    SKILLS,
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
)


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Order: clear children first if any FK existed; here tables are independent.
        for model in (Background, CharacterClass, Race, Skill, Ability, Feat, Item):
            await db.execute(delete(model))

        db.add_all([Ability(**row) for row in ABILITIES])
        db.add_all([Skill(**row) for row in SKILLS])
        db.add_all([Race(**row) for row in RACES])
        db.add_all([Feat(**row) for row in FEATS])
        db.add_all([Item(**row) for row in ITEMS])
        db.add_all([CharacterClass(**row) for row in CLASSES])
        db.add_all([Background(**row) for row in BACKGROUNDS])

        await db.commit()

    counts = {
        "abilities": len(ABILITIES),
        "skills": len(SKILLS),
        "races": len(RACES),
        "feats": len(FEATS),
        "items": len(ITEMS),
        "classes": len(CLASSES),
        "backgrounds": len(BACKGROUNDS),
    }
    print("Seeded:", counts)


if __name__ == "__main__":
    asyncio.run(seed())
