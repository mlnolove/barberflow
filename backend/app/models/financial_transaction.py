import uuid
from datetime import date
from enum import StrEnum

from sqlalchemy import Date, Enum, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class FinancialTransactionType(StrEnum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"


class FinancialTransaction(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Lançamento financeiro (entrada ou saída).

    É um livro-razão imutável (seção 50): nunca existe endpoint para editar
    valor/tipo depois de criado. Uma correção é sempre uma nova transação de
    estorno (`reversal_of_id`) que marca a original como `is_voided`.
    """

    __tablename__ = "financial_transactions"

    type: Mapped[FinancialTransactionType] = mapped_column(
        Enum(FinancialTransactionType, native_enum=False, length=10), nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    payment_method_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payment_methods.id", ondelete="RESTRICT"), nullable=False
    )
    responsible_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    reversal_of_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("financial_transactions.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_voided: Mapped[bool] = mapped_column(default=False, nullable=False)

    payment_method: Mapped["PaymentMethod"] = relationship()  # noqa: F821
    responsible_user: Mapped["User"] = relationship(foreign_keys=[responsible_user_id])  # noqa: F821
