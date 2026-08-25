from enum import StrEnum

from sqlalchemy import Enum, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class FinancialAccountType(StrEnum):
    PIX = "PIX"
    BANK_ACCOUNT = "BANK_ACCOUNT"


class FinancialAccount(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Conta de recebimento da barbearia (seção 12) — dado extremamente
    sensível. `encrypted_details` guarda um JSON criptografado (Fernet, ver
    `core/crypto.py`) com a chave PIX ou os dados bancários; nunca é
    devolvido em texto puro por nenhum endpoint, nem para o próprio dono
    (ver `schemas/financial_account.FinancialAccountRead`, que só expõe uma
    versão mascarada). Um por tenant."""

    __tablename__ = "financial_accounts"
    __table_args__ = (UniqueConstraint("tenant_id", name="uq_financial_account_tenant"),)

    account_type: Mapped[FinancialAccountType] = mapped_column(
        Enum(FinancialAccountType, native_enum=False, length=20), nullable=False
    )
    holder_name: Mapped[str] = mapped_column(String(150), nullable=False)
    encrypted_details: Mapped[str] = mapped_column(Text, nullable=False)
