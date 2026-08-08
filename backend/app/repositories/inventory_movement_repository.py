import uuid

from sqlalchemy import func, select

from app.models.inventory_movement import InventoryMovement
from app.repositories.base import TenantScopedRepository


class InventoryMovementRepository(TenantScopedRepository[InventoryMovement]):
    model = InventoryMovement

    def list_by_product(
        self, product_id: uuid.UUID, *, page: int = 1, limit: int = 20
    ) -> tuple[list[InventoryMovement], int]:
        stmt = self._scoped().where(InventoryMovement.product_id == product_id)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        stmt = (
            stmt.order_by(InventoryMovement.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
        )
        items = list(self.db.execute(stmt).scalars().all())

        return items, total
