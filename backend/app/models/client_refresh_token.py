import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPKMixin


class ClientRefreshToken(UUIDPKMixin, TimestampMixin, Base):
    """Sessão de refresh token do domínio de cliente — espelha `RefreshToken`
    (staff), mas em tabela própria: os dois domínios de auth nunca
    compartilham tabela, para que uma falha/bug num não vaze para o outro."""

    __tablename__ = "client_refresh_tokens"

    client_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    jti: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    replaced_by_jti: Mapped[str | None] = mapped_column(String(36), nullable=True)

    client_account: Mapped["ClientAccount"] = relationship()  # noqa: F821
