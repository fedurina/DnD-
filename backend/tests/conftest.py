"""Test fixtures.

Strategy:
- Use a dedicated Postgres database `dnd_test` (created on first session run).
- Drop & recreate schema once per session, then seed reference data.
- TRUNCATE user-data tables before each test for isolation.
- AsyncClient + ASGITransport hits the FastAPI app in-process.
"""
import os

# IMPORTANT: this must precede any `from app...` imports so pydantic-settings
# picks up the test DB before the engine is constructed at module import time.
TEST_DB_NAME = os.getenv("TEST_DB_NAME", "dnd_test")
TEST_DB_HOST = os.getenv("POSTGRES_HOST", "db")
TEST_DB_USER = os.getenv("POSTGRES_USER", "dnd")
TEST_DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "dnd")
os.environ["DATABASE_URL"] = (
    f"postgresql+asyncpg://{TEST_DB_USER}:{TEST_DB_PASSWORD}@{TEST_DB_HOST}:5432/{TEST_DB_NAME}"
)

import asyncpg  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool  # noqa: E402

from app import models  # noqa: F401, E402  ensures models are registered
import app.db.session as session_module  # noqa: E402
from app.data.srd_55 import (  # noqa: E402
    ABILITIES,
    BACKGROUNDS,
    CLASSES,
    RACES,
    SKILLS,
)
from app.db.base import Base  # noqa: E402
from app.models.reference import (  # noqa: E402
    Ability,
    Background,
    CharacterClass,
    Race,
    Skill,
)

# Replace the production engine (lru-cached pool) with a NullPool one so each
# operation grabs a fresh connection, sidestepping asyncpg's loop-affinity.
session_module.engine = create_async_engine(
    os.environ["DATABASE_URL"], poolclass=NullPool, echo=False, future=True
)
session_module.AsyncSessionLocal = async_sessionmaker(
    bind=session_module.engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
engine = session_module.engine
AsyncSessionLocal = session_module.AsyncSessionLocal

from app.main import app  # noqa: E402  must come after engine swap


async def _ensure_test_db() -> None:
    """Create the test database if it doesn't exist (connecting via system db)."""
    conn = await asyncpg.connect(
        host=TEST_DB_HOST,
        user=TEST_DB_USER,
        password=TEST_DB_PASSWORD,
        database="postgres",
    )
    try:
        exists = await conn.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1", TEST_DB_NAME
        )
        if not exists:
            await conn.execute(f'CREATE DATABASE "{TEST_DB_NAME}"')
    finally:
        await conn.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_database():
    await _ensure_test_db()

    # Reset schema and seed reference data once per session.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        db.add_all([Ability(**r) for r in ABILITIES])
        db.add_all([Skill(**r) for r in SKILLS])
        db.add_all([Race(**r) for r in RACES])
        db.add_all([CharacterClass(**r) for r in CLASSES])
        db.add_all([Background(**r) for r in BACKGROUNDS])
        await db.commit()

    yield

    await engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def clean_user_data():
    """Wipe non-reference tables before each test."""
    async with engine.begin() as conn:
        await conn.execute(
            text(
                "TRUNCATE campaign_members, campaigns, characters, users "
                "RESTART IDENTITY CASCADE"
            )
        )


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


# ---------------------------------------------------------------- factories


def valid_character_payload(**overrides) -> dict:
    payload = {
        "name": "Тестовый",
        "alignment": "neutral",
        "race_code": "elf",
        "class_code": "wizard",
        "background_code": "sage",
        "ability_scores": {
            "str": 8, "dex": 14, "con": 13, "int": 15, "wis": 12, "cha": 10,
        },
        "background_bonuses": {"int": 2, "wis": 1},
        "chosen_skills": ["investigation", "religion"],
    }
    payload.update(overrides)
    return payload


# --------------------------------------------------------------- auth fixtures


async def _register_and_login(
    client: AsyncClient, *, email: str, username: str, password: str, role: str
) -> dict:
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": username, "password": password, "role": role},
    )
    assert r.status_code == 201, r.text
    user = r.json()

    r = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert r.status_code == 200, r.text
    tokens = r.json()
    return {
        "user": user,
        "tokens": tokens,
        "headers": {"Authorization": f"Bearer {tokens['access_token']}"},
    }


@pytest_asyncio.fixture
async def player(client):
    return await _register_and_login(
        client,
        email="alice@test.com",
        username="alice",
        password="alicepass1",
        role="player",
    )


@pytest_asyncio.fixture
async def player2(client):
    return await _register_and_login(
        client,
        email="carol@test.com",
        username="carol",
        password="carolpass1",
        role="player",
    )


@pytest_asyncio.fixture
async def master(client):
    return await _register_and_login(
        client,
        email="bob@test.com",
        username="bob",
        password="bobpass1",
        role="master",
    )
