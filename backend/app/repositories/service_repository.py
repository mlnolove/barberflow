from sqlalchemy import func, or_, select

from app.models.service import Service
from app.repositories.base import TenantScopedRepository


class ServiceRepository(TenantScopedRepository[Service]):
    model = Service

    def search(
        self,
        *,
        query: str | None = None,
        is_active: bool | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Service], int]:
        stmt = self._scoped()

        if query:
            like = f"%{query}%"
            stmt = stmt.where(or_(Service.name.ilike(like), Service.category.ilike(like)))

        if is_active is not None:
            stmt = stmt.where(Service.is_active == is_active)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        stmt = stmt.order_by(Service.name).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
