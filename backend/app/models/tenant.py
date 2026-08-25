from enum import StrEnum

from sqlalchemy import Enum, Index, Numeric, SmallInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class SchedulingMode(StrEnum):
    TIME_SLOT = "TIME_SLOT"
    QUEUE = "QUEUE"


class Tenant(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Representa uma barbearia (tenant) isolada no sistema multi-tenant."""

    __tablename__ = "tenants"
    __table_args__ = (Index("ix_tenants_latitude_longitude", "latitude", "longitude"),)

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), unique=True, nullable=False, index=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    # Marketplace (fase de descoberta/agendamento pelo cliente)
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    scheduling_mode: Mapped[SchedulingMode] = mapped_column(
        Enum(SchedulingMode, native_enum=False, length=20),
        default=SchedulingMode.TIME_SLOT,
        nullable=False,
    )
    """Modo `QUEUE` (fila/ordem de chegada) é reservado pelo modelo de dados
    mas seu motor ainda não está implementado — só `TIME_SLOT` tem cobertura
    de agendamento hoje."""
    auto_approve_appointments: Mapped[bool] = mapped_column(default=True, nullable=False)
    cancellation_deadline_minutes: Mapped[int | None] = mapped_column(nullable=True)
    """Antecedência mínima, em minutos, para o CLIENTE cancelar um
    agendamento — `None` significa sem restrição. Não afeta cancelamento
    pela equipe, que continua livre (governado só por `allow_cancellation`)."""

    users: Mapped[list["User"]] = relationship(back_populates="tenant")  # noqa: F821
