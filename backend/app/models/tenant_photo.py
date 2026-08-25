from sqlalchemy import SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class TenantPhoto(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Foto da galeria da barbearia (distinta do `logo_url` único do tenant).
    `position` controla a ordem de exibição no app do cliente."""

    __tablename__ = "tenant_photos"

    url: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(SmallInteger, default=0, nullable=False)
