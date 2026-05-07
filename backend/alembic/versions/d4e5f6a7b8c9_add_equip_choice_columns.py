"""add equip_class_choice and equip_bg_choice to characters

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-07 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column(
            "equip_class_choice",
            sa.String(length=8),
            nullable=False,
            server_default="set",
        ),
    )
    op.add_column(
        "characters",
        sa.Column(
            "equip_bg_choice",
            sa.String(length=8),
            nullable=False,
            server_default="set",
        ),
    )
    op.alter_column("characters", "equip_class_choice", server_default=None)
    op.alter_column("characters", "equip_bg_choice", server_default=None)


def downgrade() -> None:
    op.drop_column("characters", "equip_bg_choice")
    op.drop_column("characters", "equip_class_choice")
