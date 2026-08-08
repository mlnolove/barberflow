from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, UUIDPKMixin


class PaymentMethod(UUIDPKMixin, TenantScopedMixin, Base):
    """Forma de pagamento aceita pela barbearia (seção 19).

    Catálogo fixo semeado no cadastro do tenant (dinheiro, pix, débito,
    crédito, outros) — o dono apenas ativa/desativa, não cria novos códigos.
    """

    __tablename__ = "payment_methods"
    __table_args__ = (UniqueConstraint("tenant_id", "code", name="uq_payment_method_tenant_code"),)

    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
