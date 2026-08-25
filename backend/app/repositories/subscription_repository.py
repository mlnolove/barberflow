from sqlalchemy.orm import joinedload

from app.models.subscription import Subscription
from app.repositories.base import TenantScopedRepository


class SubscriptionRepository(TenantScopedRepository[Subscription]):
    model = Subscription

    def get_current(self) -> Subscription | None:
        stmt = self._scoped().options(joinedload(Subscription.plan))
        return self.db.execute(stmt).scalar_one_or_none()
