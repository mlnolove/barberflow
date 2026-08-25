import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TenantScopedMixin, TimestampMixin, UUIDPKMixin


class Customer(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, TenantScopedMixin, Base):
    __tablename__ = "customers"
    __table_args__ = (
        Index(
            "uq_customer_tenant_client_account",
            "tenant_id",
            "client_account_id",
            unique=True,
            postgresql_where=text("client_account_id IS NOT NULL"),
        ),
    )

    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    # NULL só ocorre para clientes vindos do app (`client_account_id`
    # preenchido) que ainda não informaram telefone no perfil — cadastro
    # manual pela equipe (`CustomerCreate`) continua exigindo telefone via
    # validação do schema, a coluna só ficou mais permissiva no banco.
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Preenchido quando este registro (tenant-scoped, como sempre foi)
    # corresponde a um cliente que tem conta no app (`ClientAccount`,
    # global). Um walk-in cadastrado manualmente pela equipe continua com
    # isso NULL — nada muda para o fluxo existente.
    client_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("client_accounts.id", ondelete="SET NULL"), nullable=True
    )

    client_account: Mapped["ClientAccount"] = relationship()  # noqa: F821
