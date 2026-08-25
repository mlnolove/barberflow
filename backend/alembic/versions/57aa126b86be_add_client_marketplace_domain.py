"""add client marketplace domain

Revision ID: 57aa126b86be
Revises: cabc09e41d68
Create Date: 2026-08-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '57aa126b86be'
down_revision: Union[str, None] = 'cabc09e41d68'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'client_accounts',
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=20), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column('location_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_client_accounts_email'), 'client_accounts', ['email'], unique=True)

    op.create_table(
        'client_refresh_tokens',
        sa.Column('client_account_id', sa.UUID(), nullable=False),
        sa.Column('jti', sa.String(length=36), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked', sa.Boolean(), nullable=False),
        sa.Column('replaced_by_jti', sa.String(length=36), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_account_id'], ['client_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_client_refresh_tokens_client_account_id'),
        'client_refresh_tokens',
        ['client_account_id'],
        unique=False,
    )
    op.create_index(op.f('ix_client_refresh_tokens_jti'), 'client_refresh_tokens', ['jti'], unique=True)

    op.create_table(
        'client_favorites',
        sa.Column('client_account_id', sa.UUID(), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_account_id'], ['client_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('client_account_id', 'tenant_id', name='uq_client_favorite'),
    )
    op.create_index(
        op.f('ix_client_favorites_client_account_id'), 'client_favorites', ['client_account_id'], unique=False
    )
    op.create_index(op.f('ix_client_favorites_tenant_id'), 'client_favorites', ['tenant_id'], unique=False)

    op.create_table(
        'password_reset_tokens',
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('client_account_id', sa.UUID(), nullable=True),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            '(user_id IS NULL) != (client_account_id IS NULL)',
            name='ck_password_reset_token_single_subject',
        ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_account_id'], ['client_accounts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_password_reset_tokens_token_hash'), 'password_reset_tokens', ['token_hash'], unique=True
    )

    op.create_table(
        'tenant_photos',
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('position', sa.SmallInteger(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_tenant_photos_tenant_id'), 'tenant_photos', ['tenant_id'], unique=False)

    op.add_column('tenants', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('tenants', sa.Column('latitude', sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column('tenants', sa.Column('longitude', sa.Numeric(precision=9, scale=6), nullable=True))
    op.add_column(
        'tenants',
        sa.Column(
            'scheduling_mode',
            sa.Enum('TIME_SLOT', 'QUEUE', name='schedulingmode', native_enum=False, length=20),
            nullable=False,
            server_default='TIME_SLOT',
        ),
    )
    op.add_column(
        'tenants',
        sa.Column('auto_approve_appointments', sa.Boolean(), nullable=False, server_default='true'),
    )
    op.add_column('tenants', sa.Column('cancellation_deadline_minutes', sa.Integer(), nullable=True))
    op.create_index(
        'ix_tenants_latitude_longitude', 'tenants', ['latitude', 'longitude'], unique=False
    )

    op.add_column('customers', sa.Column('client_account_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_customers_client_account_id',
        'customers',
        'client_accounts',
        ['client_account_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.alter_column('customers', 'phone', existing_type=sa.String(length=20), nullable=True)
    op.create_index(
        'uq_customer_tenant_client_account',
        'customers',
        ['tenant_id', 'client_account_id'],
        unique=True,
        postgresql_where=sa.text('client_account_id IS NOT NULL'),
    )

    op.add_column('appointment_status_history', sa.Column('changed_by_client_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_appointment_status_history_changed_by_client_id',
        'appointment_status_history',
        'client_accounts',
        ['changed_by_client_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint(
        'fk_appointment_status_history_changed_by_client_id',
        'appointment_status_history',
        type_='foreignkey',
    )
    op.drop_column('appointment_status_history', 'changed_by_client_id')

    op.drop_index('uq_customer_tenant_client_account', table_name='customers')
    op.alter_column('customers', 'phone', existing_type=sa.String(length=20), nullable=False)
    op.drop_constraint('fk_customers_client_account_id', 'customers', type_='foreignkey')
    op.drop_column('customers', 'client_account_id')

    op.drop_index('ix_tenants_latitude_longitude', table_name='tenants')
    op.drop_column('tenants', 'cancellation_deadline_minutes')
    op.drop_column('tenants', 'auto_approve_appointments')
    op.drop_column('tenants', 'scheduling_mode')
    op.drop_column('tenants', 'longitude')
    op.drop_column('tenants', 'latitude')
    op.drop_column('tenants', 'description')

    op.drop_index(op.f('ix_tenant_photos_tenant_id'), table_name='tenant_photos')
    op.drop_table('tenant_photos')

    op.drop_index(op.f('ix_password_reset_tokens_token_hash'), table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')

    op.drop_index(op.f('ix_client_favorites_tenant_id'), table_name='client_favorites')
    op.drop_index(op.f('ix_client_favorites_client_account_id'), table_name='client_favorites')
    op.drop_table('client_favorites')

    op.drop_index(op.f('ix_client_refresh_tokens_jti'), table_name='client_refresh_tokens')
    op.drop_index(op.f('ix_client_refresh_tokens_client_account_id'), table_name='client_refresh_tokens')
    op.drop_table('client_refresh_tokens')

    op.drop_index(op.f('ix_client_accounts_email'), table_name='client_accounts')
    op.drop_table('client_accounts')
