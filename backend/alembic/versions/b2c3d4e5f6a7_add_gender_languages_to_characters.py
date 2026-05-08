"""add gender and languages to characters

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-07 12:00:00.000000

Non-destructive: backfills existing rows via server_default, then drops the
default so future inserts must supply a value (matching the model). Pre-2024
characters get sentinel defaults (gender=female, ["common", "elvish", "draconic"])
that are valid per current Pydantic rules; players can edit them via the wizard.
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
