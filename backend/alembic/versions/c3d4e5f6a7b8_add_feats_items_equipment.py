"""add feats, items, equipment columns

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-07 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Wipe characters: schema is changing significantly (NOT NULL items, gold, feats).
    op.execute("DELETE FROM characters")

    # ---- new ref tables ----
    op.create_table(
        "ref_feats",
        sa.Column("code", sa.String(length=64), primary_key=True),
        sa.Column("name_ru", sa.String(length=96), nullable=False),
        sa.Column("description_ru", sa.Text(), nullable=False, server_default=""),
        sa.Column("category", sa.String(length=24), nullable=False),
        sa.Column("prerequisites_ru", sa.String(length=256), nullable=True),
        sa.Column("is_repeatable", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "ref_items",
        sa.Column("code", sa.String(length=64), primary_key=True),
        sa.Column("name_ru", sa.String(length=96), nullable=False),
        sa.Column("description_ru", sa.Text(), nullable=False, server_default=""),
        sa.Column("type", sa.String(length=24), nullable=False),
        sa.Column("cost_gp", sa.Numeric(10, 2), nullable=True),
    )

    # ---- ref_classes: starting equipment + alt gold ----
    op.add_column(
        "ref_classes",
        sa.Column(
            "starting_equipment",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "ref_classes",
        sa.Column(
            "starting_gold_alt",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.alter_column("ref_classes", "starting_equipment", server_default=None)
    op.alter_column("ref_classes", "starting_gold_alt", server_default=None)

    # ---- ref_backgrounds: replace feat_ru with feat_code, add equipment ----
    op.add_column(
        "ref_backgrounds",
        sa.Column("feat_code", sa.String(length=64), nullable=False, server_default=""),
    )
    op.add_column(
        "ref_backgrounds",
        sa.Column(
            "starting_equipment",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "ref_backgrounds",
        sa.Column(
            "starting_gold_alt",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.alter_column("ref_backgrounds", "feat_code", server_default=None)
    op.alter_column("ref_backgrounds", "starting_equipment", server_default=None)
    op.alter_column("ref_backgrounds", "starting_gold_alt", server_default=None)
    op.drop_column("ref_backgrounds", "feat_ru")

    # ---- characters: feats, items, gold ----
    op.add_column(
        "characters",
        sa.Column(
            "feats",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "characters",
        sa.Column(
            "items",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
    )
    op.add_column(
        "characters",
        sa.Column("gold", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("characters", "feats", server_default=None)
    op.alter_column("characters", "items", server_default=None)
    op.alter_column("characters", "gold", server_default=None)


def downgrade() -> None:
    op.drop_column("characters", "gold")
    op.drop_column("characters", "items")
    op.drop_column("characters", "feats")

    op.add_column(
        "ref_backgrounds",
        sa.Column("feat_ru", sa.String(length=128), nullable=False, server_default=""),
    )
    op.alter_column("ref_backgrounds", "feat_ru", server_default=None)
    op.drop_column("ref_backgrounds", "starting_gold_alt")
    op.drop_column("ref_backgrounds", "starting_equipment")
    op.drop_column("ref_backgrounds", "feat_code")

    op.drop_column("ref_classes", "starting_gold_alt")
    op.drop_column("ref_classes", "starting_equipment")

    op.drop_table("ref_items")
    op.drop_table("ref_feats")
