import uuid
from enum import StrEnum

from sqlalchemy import Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class InventoryMovementType(StrEnum):
    ENTRY = "ENTRY"
    EXIT = "EXIT"
    ADJUSTMENT = "ADJUSTMENT"
    LOSS = "LOSS"
    SALE = "SALE"
    RETURN = "RETURN"


class InventoryMovement(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Registro imutável de cada alteração de estoque — nunca é editado ou
    apagado, apenas criado. É a fonte de verdade auditável do saldo."""

    __tablename__ = "inventory_movements"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[InventoryMovementType] = mapped_column(
        Enum(InventoryMovementType, native_enum=False, length=20), nullable=False
    )
    quantity_change: Mapped[int] = mapped_column(nullable=False)
    quantity_before: Mapped[int] = mapped_column(nullable=False)
    quantity_after: Mapped[int] = mapped_column(nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    product: Mapped["Product"] = relationship()  # noqa: F821
    created_by: Mapped["User"] = relationship()  # noqa: F821
