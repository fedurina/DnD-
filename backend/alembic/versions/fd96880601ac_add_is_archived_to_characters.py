"""добавление is_archived к characters

Revision ID: fd96880601ac
Revises: 99625dcd578b
Create Date: 2026-04-27 05:20:15.950395

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Идентификаторы ревизии, используются Alembic.
revision: str = 'fd96880601ac'
down_revision: Union[str, None] = '99625dcd578b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'characters',
        sa.Column(
            'is_archived',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    # Сбрасываем server_default, чтобы будущие INSERT-ы полагались только на default из Python.
    op.alter_column('characters', 'is_archived', server_default=None)


def downgrade() -> None:
    # ### команды автогенерированы Alembic — отредактируйте при необходимости ###
    op.drop_column('characters', 'is_archived')
    # ### конец команд Alembic ###
