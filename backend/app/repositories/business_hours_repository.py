from app.models.business_hours import BusinessHours
from app.repositories.base import TenantScopedRepository


class BusinessHoursRepository(TenantScopedRepository[BusinessHours]):
    model = BusinessHours

    def get_by_weekday(self, weekday: int) -> BusinessHours | None:
        stmt = self._scoped().where(BusinessHours.weekday == weekday)
        return self.db.execute(stmt).scalar_one_or_none()
