"""добавление master_notes к campaigns

Revision ID: a2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-05-09 12:00:00.000000

Неразрушающая миграция: новая колонка с server_default='', существующие
кампании получают пустую строку. Default снимается, чтобы будущие INSERT-ы
передавали значение явно (как в модели).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a2b3c4d5e6f7"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "campaigns",
        sa.Column(
            "master_notes",
            sa.Text(),
            nullable=False,
            server_default="",
        ),
    )
    op.alter_column("campaigns", "master_notes", server_default=None)


def downgrade() -> None:
    op.drop_column("campaigns", "master_notes")
