import uuid

from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TenantScopedMixin, TimestampMixin, UUIDPKMixin


class Product(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, TenantScopedMixin, Base):
    """Produto de estoque (ex.: pomada, shampoo).

    `current_quantity` é um cache do saldo — nunca é alterado diretamente
    por um endpoint genérico de update; toda alteração passa por uma
    operação de estoque (`InventoryMovement`) dentro da mesma transação,
    para nunca perder o histórico (seção 16 da especificação).
    """

    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    sku: Mapped[str | None] = mapped_column(String(50), nullable=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    current_quantity: Mapped[int] = mapped_column(default=0, nullable=False)
    min_stock: Mapped[int] = mapped_column(default=0, nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    sale_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    supplier_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True
    )

    supplier: Mapped["Supplier"] = relationship()  # noqa: F821
