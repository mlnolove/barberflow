import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class Permission(UUIDPKMixin, Base):
    """Permissão granular do sistema, ex: 'clients.view', 'finance.delete'."""

    __tablename__ = "permissions"

    code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    module: Mapped[str] = mapped_column(String(30), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)


class RolePermission(Base):
    """Conjunto padrão de permissões de um role, usado como seed ao criar usuário."""

    __tablename__ = "role_permissions"
    __table_args__ = (UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False
    )

    role: Mapped["Role"] = relationship()  # noqa: F821
    permission: Mapped["Permission"] = relationship()


class UserPermission(Base):
    """Override individual de permissão (grant/revoke) sobre o padrão do role.

    Permite ao OWNER customizar permissões de um funcionário específico
    (seção 4 da especificação) sem duplicar todo o conjunto de permissões.
    """

    __tablename__ = "user_permissions"
    __table_args__ = (UniqueConstraint("user_id", "permission_id", name="uq_user_permission"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    permission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("permissions.id", ondelete="CASCADE"), nullable=False
    )
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)

    user: Mapped["User"] = relationship(back_populates="permission_overrides")  # noqa: F821
    permission: Mapped["Permission"] = relationship()
