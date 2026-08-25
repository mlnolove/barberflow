"""add notifications

Revision ID: 5969f5c387f8
Revises: bcee08e53d31
Create Date: 2026-08-24 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '5969f5c387f8'
down_revision: Union[str, None] = 'bcee08e53d31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('tenant_id', sa.UUID(), nullable=True),
        sa.Column(
            'recipient_type',
            sa.Enum('USER', 'CLIENT', name='notificationrecipienttype', native_enum=False, length=10),
            nullable=False,
        ),
        sa.Column('recipient_user_id', sa.UUID(), nullable=True),
        sa.Column('recipient_client_id', sa.UUID(), nullable=True),
        sa.Column(
            'type',
            sa.Enum(
                'NEW_APPOINTMENT', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_REJECTED',
                'APPOINTMENT_CANCELLED', 'APPOINTMENT_REMINDER', 'NEW_MESSAGE',
                'PAYMENT_CONFIRMED', 'PAYMENT_FAILED', 'SUBSCRIPTION_RENEWED',
                name='notificationtype', native_enum=False, length=30,
            ),
            nullable=False,
        ),
        sa.Column('title', sa.String(length=150), nullable=False),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('metadata_json', postgresql.JSONB(), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_client_id'], ['client_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_notifications_tenant_id'), 'notifications', ['tenant_id'], unique=False)
    op.create_index(
        op.f('ix_notifications_recipient_user_id'), 'notifications', ['recipient_user_id'], unique=False
    )
    op.create_index(
        op.f('ix_notifications_recipient_client_id'),
        'notifications',
        ['recipient_client_id'],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_notifications_recipient_client_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_recipient_user_id'), table_name='notifications')
    op.drop_index(op.f('ix_notifications_tenant_id'), table_name='notifications')
    op.drop_table('notifications')
