import uuid
from datetime import datetime
from decimal import Decimal
from enum import StrEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    SmallInteger,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TenantScopedMixin, TimestampMixin, UUIDPKMixin


class BillingInterval(StrEnum):
    MONTHLY = "MONTHLY"
    ANNUAL = "ANNUAL"


class SubscriptionStatus(StrEnum):
    TRIAL = "TRIAL"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class SubscriptionPlan(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Catálogo de planos — global, não tenant-scoped (o mesmo plano vale
    para qualquer barbearia)."""

    __tablename__ = "subscription_plans"

    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    billing_interval: Mapped[BillingInterval] = mapped_column(
        Enum(BillingInterval, native_enum=False, length=10), nullable=False
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    trial_days: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)


class Subscription(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Assinatura da barbearia (seção 11 da especificação). Uma por tenant —
    trocar de plano atualiza esta linha, não cria uma nova."""

    __tablename__ = "subscriptions"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_subscription_tenant"),)

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, native_enum=False, length=20), nullable=False
    )
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Preenchido quando a fase de pagamentos (Mercado Pago) integrar de
    # verdade a assinatura recorrente — reservado, não usado ainda.
    external_subscription_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    plan: Mapped["SubscriptionPlan"] = relationship()
