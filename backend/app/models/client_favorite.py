import uuid

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TimestampMixin, UUIDPKMixin


class ClientFavorite(UUIDPKMixin, TimestampMixin, Base):
    """Barbearia favoritada por um cliente."""

    __tablename__ = "client_favorites"
    __table_args__ = (
        UniqueConstraint("client_account_id", "tenant_id", name="uq_client_favorite"),
    )

    client_account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("client_accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )

    tenant: Mapped["Tenant"] = relationship()  # noqa: F821
