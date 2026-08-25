import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPKMixin


class PasswordResetToken(UUIDPKMixin, TimestampMixin, Base):
    """Token de reset de senha, compartilhado pelos dois domínios de conta
    (`User` de equipe e `ClientAccount`) — exatamente um dos dois FKs deve
    estar preenchido, garantido por `CheckConstraint`. Guarda só o hash do
    token (nunca o valor em texto puro, ver `core/security.hash_reset_token`),
    é de uso único (`used_at`) e expira em `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES`."""

    __tablename__ = "password_reset_tokens"
    __table_args__ = (
        CheckConstraint(
            "(user_id IS NULL) != (client_account_id IS NULL)",
            name="ck_password_reset_token_single_subject",
        ),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    client_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_accounts.id", ondelete="CASCADE"), nullable=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship()  # noqa: F821
    client_account: Mapped["ClientAccount"] = relationship()  # noqa: F821
