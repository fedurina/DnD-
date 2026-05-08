"""добавление gender и languages к characters

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-07 12:00:00.000000

Неразрушающая миграция: бэкфиллит существующие строки через server_default, затем
сбрасывает default, чтобы будущие INSERT-ы обязательно указывали значение (как в
модели). Персонажи, созданные до 2024-х правил, получают sentinel-дефолты
(gender=female, ["common", "elvish", "draconic"]), которые валидны по текущим
правилам Pydantic; игроки потом могут поправить их в визарде.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column(
            "gender",
            sa.String(length=16),
            nullable=False,
            server_default="female",
        ),
    )
    op.add_column(
        "characters",
        sa.Column(
            "languages",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(
                "'[\"common\", \"elvish\", \"draconic\"]'::jsonb"
            ),
        ),
    )
    op.alter_column("characters", "gender", server_default=None)
    op.alter_column("characters", "languages", server_default=None)


def downgrade() -> None:
    op.drop_column("characters", "languages")
    op.drop_column("characters", "gender")
