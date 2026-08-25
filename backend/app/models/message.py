import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import CheckConstraint, DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPKMixin


class SenderType(StrEnum):
    CLIENT = "CLIENT"
    STAFF = "STAFF"


class Message(UUIDPKMixin, TimestampMixin, Base):
    """Mensagem dentro de uma `Conversation`. `sender_user_id`/
    `sender_client_id` identificam quem escreveu — exatamente um dos dois,
    de acordo com `sender_type` (garantido pela camada de serviço, nunca
    populado a partir de entrada do cliente)."""

    __tablename__ = "messages"
    __table_args__ = (
        CheckConstraint(
            "(sender_type = 'STAFF' AND sender_user_id IS NOT NULL "
            "AND sender_client_id IS NULL) "
            "OR (sender_type = 'CLIENT' AND sender_client_id IS NOT NULL "
            "AND sender_user_id IS NULL)",
            name="ck_message_sender_matches_type",
        ),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_type: Mapped[SenderType] = mapped_column(
        Enum(SenderType, native_enum=False, length=10), nullable=False
    )
    sender_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    sender_client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_accounts.id", ondelete="SET NULL"), nullable=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sender_user: Mapped["User"] = relationship()  # noqa: F821
    sender_client: Mapped["ClientAccount"] = relationship()  # noqa: F821
