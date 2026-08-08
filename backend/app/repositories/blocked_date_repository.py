from datetime import date

from app.models.business_hours import BlockedDate
from app.repositories.base import TenantScopedRepository


class BlockedDateRepository(TenantScopedRepository[BlockedDate]):
    model = BlockedDate

    def is_blocked(self, day: date) -> bool:
        stmt = self._scoped().where(BlockedDate.date == day)
        return self.db.execute(stmt).scalar_one_or_none() is not None
