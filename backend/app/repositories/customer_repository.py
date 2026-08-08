from sqlalchemy import func, or_, select

from app.models.customer import Customer
from app.repositories.base import TenantScopedRepository


class CustomerRepository(TenantScopedRepository[Customer]):
    model = Customer

    def search(
        self,
        *,
        query: str | None = None,
        is_active: bool | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Customer], int]:
        stmt = self._scoped()

        if query:
            like = f"%{query}%"
            stmt = stmt.where(
                or_(
                    Customer.full_name.ilike(like),
                    Customer.phone.ilike(like),
                    Customer.email.ilike(like),
                )
            )

        if is_active is not None:
            stmt = stmt.where(Customer.is_active == is_active)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        stmt = stmt.order_by(Customer.full_name).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
