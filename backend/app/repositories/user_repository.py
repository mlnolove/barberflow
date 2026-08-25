import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.role import Role
from app.models.user import User
from app.repositories.base import TenantScopedRepository


class UserRepository(TenantScopedRepository[User]):
    model = User

    def get_by_email(self, email: str) -> User | None:
        stmt = self._scoped().where(User.email == email)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_id_with_role(self, user_id: uuid.UUID) -> User | None:
        stmt = self._scoped().options(joinedload(User.role)).where(User.id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()


def find_user_by_email_global(db: Session, email: str) -> User | None:
    """Busca usuário por e-mail sem filtro de tenant.

    Único ponto do sistema que consulta usuários fora do escopo de um
    tenant — necessário porque no login o tenant ainda não é conhecido.
    Seguro porque `email` é único globalmente (ver app.models.user.User).
    """
    stmt = select(User).options(joinedload(User.role)).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none()


def find_tenant_owner(db: Session, tenant_id: uuid.UUID) -> User | None:
    """Usado para notificar o dono de eventos que não têm um destinatário
    específico já definido (novo agendamento pendente, cliente cancelou,
    pagamento confirmado/falhou) — o OWNER é sempre o único papel garantido
    a existir e a ver tudo (seção 4)."""
    stmt = (
        select(User)
        .join(Role, User.role_id == Role.id)
        .where(User.tenant_id == tenant_id, Role.code == "OWNER", User.is_active.is_(True))
    )
    return db.execute(stmt).scalar_one_or_none()
