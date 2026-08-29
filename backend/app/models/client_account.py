from datetime import datetime

from sqlalchemy import DateTime, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin, UUIDPKMixin


class ClientAccount(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, Base):
    """Conta de cliente do marketplace — domínio de autenticação totalmente
    separado de `User` (equipe/staff). Não é tenant-scoped: um cliente
    mantém uma única conta e agenda em quantas barbearias quiser. O vínculo
    entre um `ClientAccount` e o histórico dentro de uma barbearia específica
    é feito via `Customer.client_account_id` (ver `models/customer.py`)."""

    __tablename__ = "client_accounts"

    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Text (não String) porque a foto de perfil escolhida no celular vira um
    # data URI base64 salvo direto aqui — o app ainda não tem um serviço de
    # upload de arquivos separado.
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Última localização informada pelo cliente, só preenchida mediante
    # opt-in explícito no app (endpoint dedicado de localização) — nunca
    # coletada por padrão.
    latitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(9, 6), nullable=True)
    location_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
