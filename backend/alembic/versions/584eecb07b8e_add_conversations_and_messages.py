"""add conversations and messages

Revision ID: 584eecb07b8e
Revises: 57aa126b86be
Create Date: 2026-08-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '584eecb07b8e'
down_revision: Union[str, None] = '57aa126b86be'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'conversations',
        sa.Column('client_account_id', sa.UUID(), nullable=False),
        sa.Column('last_message_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['client_account_id'], ['client_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', 'client_account_id', name='uq_conversation_tenant_client'),
    )
    op.create_index(
        op.f('ix_conversations_client_account_id'), 'conversations', ['client_account_id'], unique=False
    )
    op.create_index(op.f('ix_conversations_tenant_id'), 'conversations', ['tenant_id'], unique=False)

    op.create_table(
        'messages',
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column(
            'sender_type',
            sa.Enum('CLIENT', 'STAFF', name='sendertype', native_enum=False, length=10),
            nullable=False,
        ),
        sa.Column('sender_user_id', sa.UUID(), nullable=True),
        sa.Column('sender_client_id', sa.UUID(), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "(sender_type = 'STAFF' AND sender_user_id IS NOT NULL AND sender_client_id IS NULL) "
            "OR (sender_type = 'CLIENT' AND sender_client_id IS NOT NULL AND sender_user_id IS NULL)",
            name='ck_message_sender_matches_type',
        ),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sender_client_id'], ['client_accounts.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_messages_conversation_id'), 'messages', ['conversation_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_messages_conversation_id'), table_name='messages')
    op.drop_table('messages')

    op.drop_index(op.f('ix_conversations_tenant_id'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_client_account_id'), table_name='conversations')
    op.drop_table('conversations')
