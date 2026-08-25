from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.repositories.base import TenantScopedRepository


class PaymentRepository(TenantScopedRepository[Payment]):
    model = Payment

    def list_paginated(self, *, page: int = 1, limit: int = 20) -> tuple[list[Payment], int]:
        stmt = self._scoped()
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        stmt = stmt.order_by(Payment.created_at.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total


def find_payment_by_external_id(db: Session, external_payment_id: str) -> Payment | None:
    """Webhooks do gateway não sabem o `tenant_id` — só o id externo do
    pagamento. Único ponto que consulta `payments` sem escopo de tenant,
    análogo a `find_user_by_email_global`."""
    stmt = select(Payment).where(Payment.external_payment_id == external_payment_id)
    return db.execute(stmt).scalar_one_or_none()
