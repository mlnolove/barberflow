from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import UUIDPKMixin


class Role(UUIDPKMixin, Base):
    """Papel padrão do usuário (OWNER, MANAGER, BARBER, RECEPTIONIST).

    Roles são globais e servem apenas como conjunto padrão de permissões
    aplicado na criação do usuário (seed em role_permissions). A autorização
    real sempre verifica permissões efetivas do usuário, nunca o role em si,
    pois o OWNER pode customizar permissões individualmente.
    """

    __tablename__ = "roles"

    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

    users: Mapped[list["User"]] = relationship(back_populates="role")  # noqa: F821
