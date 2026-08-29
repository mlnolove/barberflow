"""reconcile duplicate subscription_plans.code unique constraint

Revision ID: cc1af659873d
Revises: f052a77bdcd2
Create Date: 2026-08-25 21:06:24.380828

Autogenerate também sugeria criar `ix_financial_accounts_tenant_id` e
`ix_subscriptions_tenant_id` (o `TenantScopedMixin` marca `tenant_id` com
`index=True` em todo model tenant-scoped). Deliberadamente NÃO incluído
aqui: essas duas tabelas já têm `UNIQUE (tenant_id)` (`uq_financial_account_tenant`
/ `uq_subscription_tenant` — uma conta financeira e uma assinatura por
tenant), e um índice único já serve pra buscas por igualdade tão bem quanto
um índice comum — criar o segundo seria só espaço e escrita duplicados, sem
ganho real. `subscription_plans.code`, por outro lado, tinha de fato duas
constraints de unicidade redundantes (`ix_subscription_plans_code`, o índice
único que o model espera, e `subscription_plans_code_key`, uma constraint
antiga sobrando) — essa parte é uma limpeza real.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc1af659873d'
down_revision: Union[str, None] = 'f052a77bdcd2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(op.f('subscription_plans_code_key'), 'subscription_plans', type_='unique')


def downgrade() -> None:
    op.create_unique_constraint(
        op.f('subscription_plans_code_key'), 'subscription_plans', ['code'],
        postgresql_nulls_not_distinct=False,
    )
