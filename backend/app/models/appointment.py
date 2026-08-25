import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Numeric, SmallInteger, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class AppointmentStatus(StrEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


OPEN_STATUSES = (
    AppointmentStatus.PENDING,
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
)
"""Status que ocupam a agenda do profissional (bloqueiam conflito de horário)."""


class Appointment(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Agendamento de um cliente com um profissional para um serviço.

    `duration_minutes` e `price` são capturados no momento da criação a
    partir do serviço escolhido — alterações futuras no catálogo de
    serviços não devem retroagir sobre agendamentos já existentes
    (seção 49 da especificação: preservar histórico).
    """

    __tablename__ = "appointments"
    __table_args__ = (
        Index("ix_appointments_tenant_employee_starts_at", "tenant_id", "employee_id", "starts_at"),
    )

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="RESTRICT"), nullable=False
    )

    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration_minutes: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[str | None] = mapped_column(String(30), nullable=True)

    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, native_enum=False, length=20),
        default=AppointmentStatus.PENDING,
        nullable=False,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    customer: Mapped["Customer"] = relationship()  # noqa: F821
    employee: Mapped["Employee"] = relationship()  # noqa: F821
    service: Mapped["Service"] = relationship()  # noqa: F821
    status_history: Mapped[list["AppointmentStatusHistory"]] = relationship(
        back_populates="appointment",
        cascade="all, delete-orphan",
        order_by="AppointmentStatusHistory.created_at",
    )


class AppointmentStatusHistory(UUIDPKMixin, Base):
    """Trilha de auditoria de mudanças de status/reagendamento de um agendamento."""

    __tablename__ = "appointment_status_history"

    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    changed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    changed_by_client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_accounts.id", ondelete="SET NULL"), nullable=True
    )
    """Preenchido em vez de `changed_by_user_id` quando a mudança (ex.:
    solicitação/cancelamento) partiu do CLIENTE, não da equipe — nunca os
    dois ao mesmo tempo."""
    from_status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, native_enum=False, length=20), nullable=False
    )
    to_status: Mapped[AppointmentStatus] = mapped_column(
        Enum(AppointmentStatus, native_enum=False, length=20), nullable=False
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    appointment: Mapped["Appointment"] = relationship(back_populates="status_history")
    changed_by: Mapped["User"] = relationship()  # noqa: F821
    changed_by_client: Mapped["ClientAccount"] = relationship()  # noqa: F821
