"""add subclasses table, subclass_start_level on classes, subclass_code on characters

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-05-07 22:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ref_subclasses",
        sa.Column("code", sa.String(length=48), primary_key=True),
        sa.Column("class_code", sa.String(length=32), nullable=False),
        sa.Column("name_ru", sa.String(length=96), nullable=False),
        sa.Column(
            "description_ru", sa.Text(), nullable=False, server_default=""
        ),
    )
    op.create_index(
        "ix_ref_subclasses_class_code", "ref_subclasses", ["class_code"]
    )

    op.add_column(
        "ref_classes",
        sa.Column(
            "subclass_start_level",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )
    op.alter_column("ref_classes", "subclass_start_level", server_default=None)

    op.add_column(
        "characters",
        sa.Column("subclass_code", sa.String(length=48), nullable=True),
    )
    op.create_foreign_key(
        "fk_characters_subclass_code",
        "characters",
        "ref_subclasses",
        ["subclass_code"],
        ["code"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_characters_subclass_code", "characters", type_="foreignkey"
    )
    op.drop_column("characters", "subclass_code")
    op.drop_column("ref_classes", "subclass_start_level")
    op.drop_index("ix_ref_subclasses_class_code", table_name="ref_subclasses")
    op.drop_table("ref_subclasses")
