from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TenantScopedMixin, TimestampMixin, UUIDPKMixin


class Supplier(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, TenantScopedMixin, Base):
    __tablename__ = "suppliers"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
