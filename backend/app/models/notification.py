import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class NotificationType(StrEnum):
    NEW_APPOINTMENT = "NEW_APPOINTMENT"
    APPOINTMENT_CONFIRMED = "APPOINTMENT_CONFIRMED"
    APPOINTMENT_REJECTED = "APPOINTMENT_REJECTED"
    APPOINTMENT_CANCELLED = "APPOINTMENT_CANCELLED"
    APPOINTMENT_REMINDER = "APPOINTMENT_REMINDER"
    NEW_MESSAGE = "NEW_MESSAGE"
    PAYMENT_CONFIRMED = "PAYMENT_CONFIRMED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    SUBSCRIPTION_RENEWED = "SUBSCRIPTION_RENEWED"


class NotificationRecipientType(StrEnum):
    USER = "USER"
    CLIENT = "CLIENT"


class Notification(UUIDPKMixin, Base):
    """Feed de notificações in-app. `tenant_id` fica nulo apenas nos casos
    (nenhum hoje) sem barbearia associada — toda notificação real hoje
    nasce de um evento dentro de um tenant. Preparado para push (seção 15):
    toda criação também chama `core/push.get_push_backend().send(...)`,
    hoje um stub de log (sem FCM/APNs configurado — ver `core/push.py`)."""

    __tablename__ = "notifications"

    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True, index=True
    )
    recipient_type: Mapped[NotificationRecipientType] = mapped_column(
        Enum(NotificationRecipientType, native_enum=False, length=10), nullable=False
    )
    recipient_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    recipient_client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_accounts.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, native_enum=False, length=30), nullable=False
    )
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    recipient_user: Mapped["User"] = relationship()  # noqa: F821
    recipient_client: Mapped["ClientAccount"] = relationship()  # noqa: F821
