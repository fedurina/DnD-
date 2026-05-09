"""добавление current_hp и temp_hp к characters

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-05-09 10:00:00.000000

Неразрушающая миграция: existing rows получают current_hp=NULL (= «при полном
здоровье», максимум считается на клиенте) и temp_hp=0 через server_default.
Default у temp_hp затем сбрасывается, чтобы будущие INSERT-ы передавали значение
явно (как в модели).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "characters",
        sa.Column("current_hp", sa.Integer(), nullable=True),
    )
    op.add_column(
        "characters",
        sa.Column(
            "temp_hp",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    op.alter_column("characters", "temp_hp", server_default=None)


def downgrade() -> None:
    op.drop_column("characters", "temp_hp")
    op.drop_column("characters", "current_hp")
