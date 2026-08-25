"""add queue entries

Revision ID: e759aae017b4
Revises: 5969f5c387f8
Create Date: 2026-08-24 03:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e759aae017b4'
down_revision: Union[str, None] = '5969f5c387f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'queue_entries',
        sa.Column('customer_id', sa.UUID(), nullable=False),
        sa.Column('employee_id', sa.UUID(), nullable=True),
        sa.Column('service_id', sa.UUID(), nullable=False),
        sa.Column(
            'status',
            sa.Enum(
                'WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CANCELLED', 'NO_SHOW',
                name='queuestatus', native_enum=False, length=20,
            ),
            nullable=False,
        ),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('called_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('finished_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancellation_reason', sa.Text(), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_queue_entries_tenant_id'), 'queue_entries', ['tenant_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_queue_entries_tenant_id'), table_name='queue_entries')
    op.drop_table('queue_entries')
