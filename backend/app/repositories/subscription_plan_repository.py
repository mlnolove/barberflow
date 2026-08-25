import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.subscription import SubscriptionPlan


class SubscriptionPlanRepository:
    """Catálogo de planos — global, não tenant-scoped."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, plan_id: uuid.UUID) -> SubscriptionPlan | None:
        return self.db.get(SubscriptionPlan, plan_id)

    def get_by_code(self, code: str) -> SubscriptionPlan | None:
        stmt = select(SubscriptionPlan).where(SubscriptionPlan.code == code)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_active(self) -> list[SubscriptionPlan]:
        stmt = (
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active.is_(True))
            .order_by(SubscriptionPlan.price)
        )
        return list(self.db.execute(stmt).scalars().all())

    def add(self, plan: SubscriptionPlan) -> SubscriptionPlan:
        self.db.add(plan)
        self.db.flush()
        return plan
