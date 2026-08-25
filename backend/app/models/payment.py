import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class PaymentPurpose(StrEnum):
    SUBSCRIPTION = "SUBSCRIPTION"
    APPOINTMENT = "APPOINTMENT"
    """Pagamento de serviço pelo cliente — reservado para quando o gateway
    de cobrança de agendamentos for implementado; nada cria esse tipo hoje."""


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Payment(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Histórico de cobranças (seção 11). Nenhum dado sensível de cartão é
    armazenado aqui — só o resultado do processamento feito pelo gateway
    (Mercado Pago), identificado por `external_payment_id`. Sem gateway
    configurado ainda, `gateway`/`external_payment_id` ficam nulos e o
    registro existe só para representar a cobrança pendente."""

    __tablename__ = "payments"

    purpose: Mapped[PaymentPurpose] = mapped_column(
        Enum(PaymentPurpose, native_enum=False, length=20), nullable=False
    )
    subscription_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True
    )
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, native_enum=False, length=20),
        default=PaymentStatus.PENDING,
        nullable=False,
    )
    gateway: Mapped[str | None] = mapped_column(String(30), nullable=True)
    external_payment_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    subscription: Mapped["Subscription"] = relationship()  # noqa: F821
