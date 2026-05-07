"""add gender and languages to characters

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-07 12:00:00.000000

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
    # Wipe existing characters: schema is changing significantly (adding NOT NULL
    # gender + languages, expected to be set via the new wizard). campaign_members
    # has ON DELETE SET NULL on character_id, so DELETE clears membership refs safely.
    op.execute("DELETE FROM characters")

    op.add_column(
        "characters",
        sa.Column("gender", sa.String(length=16), nullable=False),
    )
    op.add_column(
        "characters",
        sa.Column(
            "languages",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.alter_column("characters", "languages", server_default=None)


def downgrade() -> None:
    op.drop_column("characters", "languages")
    op.drop_column("characters", "gender")
