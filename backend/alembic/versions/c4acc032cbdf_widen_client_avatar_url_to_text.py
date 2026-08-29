"""widen client avatar_url to text

Revision ID: c4acc032cbdf
Revises: e759aae017b4
Create Date: 2026-08-25 19:44:18.250581

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4acc032cbdf'
down_revision: Union[str, None] = 'e759aae017b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('client_accounts', 'avatar_url',
               existing_type=sa.VARCHAR(length=500),
               type_=sa.Text(),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('client_accounts', 'avatar_url',
               existing_type=sa.Text(),
               type_=sa.VARCHAR(length=500),
               existing_nullable=True)
