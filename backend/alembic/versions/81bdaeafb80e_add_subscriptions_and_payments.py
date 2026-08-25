"""add subscriptions and payments

Revision ID: 81bdaeafb80e
Revises: 584eecb07b8e
Create Date: 2026-08-24 00:30:00.000000

"""
import uuid
from datetime import UTC, datetime, timedelta
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '81bdaeafb80e'
down_revision: Union[str, None] = '584eecb07b8e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'subscription_plans',
        sa.Column('code', sa.String(length=30), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column(
            'billing_interval',
            sa.Enum('MONTHLY', 'ANNUAL', name='billinginterval', native_enum=False, length=10),
            nullable=False,
        ),
        sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('trial_days', sa.SmallInteger(), nullable=False),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('code'),
    )
    op.create_index(op.f('ix_subscription_plans_code'), 'subscription_plans', ['code'], unique=True)

    op.create_table(
        'subscriptions',
        sa.Column('plan_id', sa.UUID(), nullable=False),
        sa.Column(
            'status',
            sa.Enum(
                'TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED',
                name='subscriptionstatus', native_enum=False, length=20,
            ),
            nullable=False,
        ),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('external_subscription_id', sa.String(length=100), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['plan_id'], ['subscription_plans.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tenant_id', name='uq_subscription_tenant'),
    )

    op.create_table(
        'payments',
        sa.Column(
            'purpose',
            sa.Enum('SUBSCRIPTION', 'APPOINTMENT', name='paymentpurpose', native_enum=False, length=20),
            nullable=False,
        ),
        sa.Column('subscription_id', sa.UUID(), nullable=True),
        sa.Column('appointment_id', sa.UUID(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            'status',
            sa.Enum(
                'PENDING', 'PAID', 'FAILED', 'REFUNDED',
                name='paymentstatus', native_enum=False, length=20,
            ),
            nullable=False,
        ),
        sa.Column('gateway', sa.String(length=30), nullable=True),
        sa.Column('external_payment_id', sa.String(length=100), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('tenant_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['subscription_id'], ['subscriptions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('external_payment_id'),
    )
    op.create_index(op.f('ix_payments_tenant_id'), 'payments', ['tenant_id'], unique=False)

    # Backfill: tenants criados antes desta fase não passam pelo
    # provisionamento automático de assinatura no signup — sem isso, ficam
    # sem nenhuma linha em `subscriptions` para sempre. Cada um recebe uma
    # assinatura ACTIVE de validade longa (não TRIAL: já usam o sistema).
    conn = op.get_bind()
    now = datetime.now(UTC)
    monthly_id = uuid.uuid4()
    annual_id = uuid.uuid4()
    conn.execute(
        sa.text(
            "INSERT INTO subscription_plans "
            "(id, code, name, billing_interval, price, trial_days, created_at, updated_at, is_active) "
            "VALUES (:id, :code, :name, :interval, :price, :trial_days, :now, :now, true)"
        ),
        [
            {
                "id": monthly_id,
                "code": "monthly",
                "name": "Mensal",
                "interval": "MONTHLY",
                "price": 49.90,
                "trial_days": 14,
                "now": now,
            },
            {
                "id": annual_id,
                "code": "annual",
                "name": "Anual",
                "interval": "ANNUAL",
                "price": 499.00,
                "trial_days": 14,
                "now": now,
            },
        ],
    )

    tenant_ids = [row[0] for row in conn.execute(sa.text("SELECT id FROM tenants")).fetchall()]
    for tenant_id in tenant_ids:
        conn.execute(
            sa.text(
                "INSERT INTO subscriptions "
                "(id, tenant_id, plan_id, status, current_period_start, current_period_end, "
                "cancel_at_period_end, created_at, updated_at) "
                "VALUES (:id, :tenant_id, :plan_id, 'ACTIVE', :start, :end, false, :now, :now)"
            ),
            {
                "id": uuid.uuid4(),
                "tenant_id": tenant_id,
                "plan_id": monthly_id,
                "start": now,
                "end": now + timedelta(days=3650),
                "now": now,
            },
        )


def downgrade() -> None:
    op.drop_index(op.f('ix_payments_tenant_id'), table_name='payments')
    op.drop_table('payments')
    op.drop_table('subscriptions')
    op.drop_index(op.f('ix_subscription_plans_code'), table_name='subscription_plans')
    op.drop_table('subscription_plans')
