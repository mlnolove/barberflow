"""widen tenant photo url to text

Revision ID: f052a77bdcd2
Revises: c4acc032cbdf
Create Date: 2026-08-25 20:14:13.980300

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f052a77bdcd2'
down_revision: Union[str, None] = 'c4acc032cbdf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('tenant_photos', 'url',
               existing_type=sa.VARCHAR(length=500),
               type_=sa.Text(),
               existing_nullable=False)


def downgrade() -> None:
    op.alter_column('tenant_photos', 'url',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(length=500),
               existing_nullable=False)
