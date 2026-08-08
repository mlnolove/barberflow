from sqlalchemy import SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class Tenant(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Representa uma barbearia (tenant) isolada no sistema multi-tenant."""

    __tablename__ = "tenants"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(7), default="#0F172A", nullable=False)
    secondary_color: Mapped[str] = mapped_column(String(7), default="#2563EB", nullable=False)
    onboarding_completed: Mapped[bool] = mapped_column(default=False, nullable=False)
    appointment_buffer_minutes: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
    min_advance_minutes: Mapped[int] = mapped_column(default=30, nullable=False)
    max_advance_days: Mapped[int] = mapped_column(SmallInteger, default=60, nullable=False)
    allow_cancellation: Mapped[bool] = mapped_column(default=True, nullable=False)

    users: Mapped[list["User"]] = relationship(back_populates="tenant")  # noqa: F821
