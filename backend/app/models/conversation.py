import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class Conversation(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Conversa entre um cliente e uma barbearia — uma por par
    (tenant, cliente), como pede a seção 10 da especificação."""

    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("tenant_id", "client_account_id", name="uq_conversation_tenant_client"),
    )

    client_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    client_account: Mapped["ClientAccount"] = relationship()  # noqa: F821
