import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.models.product import Product
from app.repositories.base import TenantScopedRepository


class ProductRepository(TenantScopedRepository[Product]):
    model = Product

    def _with_supplier(self, stmt):
        return stmt.options(joinedload(Product.supplier))

    def get_by_id(self, entity_id: uuid.UUID) -> Product | None:
        stmt = self._with_supplier(self._scoped()).where(Product.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_sku(self, sku: str) -> Product | None:
        stmt = self._scoped().where(Product.sku == sku)
        return self.db.execute(stmt).scalar_one_or_none()

    def search(
        self,
        *,
        query: str | None = None,
        is_active: bool | None = None,
        low_stock: bool = False,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Product], int]:
        stmt = self._scoped()

        if query:
            like = f"%{query}%"
            stmt = stmt.where(
                or_(Product.name.ilike(like), Product.sku.ilike(like), Product.category.ilike(like))
            )

        if is_active is not None:
            stmt = stmt.where(Product.is_active == is_active)

        if low_stock:
            stmt = stmt.where(Product.current_quantity <= Product.min_stock)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        stmt = (
            self._with_supplier(stmt).order_by(Product.name).offset((page - 1) * limit).limit(limit)
        )
        items = list(self.db.execute(stmt).unique().scalars().all())

        return items, total
