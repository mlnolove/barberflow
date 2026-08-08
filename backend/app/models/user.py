import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TenantScopedMixin, TimestampMixin, UUIDPKMixin
from app.models.permission import UserPermission


class User(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, TenantScopedMixin, Base):
    """Usuário do sistema.

    O e-mail é único globalmente (não apenas por tenant) para permitir login
    simples por e-mail+senha sem exigir identificação prévia da barbearia.
    Uma pessoa que atue em duas barbearias precisa de contas com e-mails
    distintos — múltiplos vínculos por usuário está fora do escopo atual.
    """

    __tablename__ = "users"

    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship(back_populates="users")  # noqa: F821
    role: Mapped["Role"] = relationship(back_populates="users")  # noqa: F821
    permission_overrides: Mapped[list["UserPermission"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
