import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.client_favorite import ClientFavorite


class ClientFavoriteRepository:
    """Escopado por `client_account_id`, exigido no construtor — mesmo
    princípio do `TenantScopedRepository`, mas a chave de isolamento é a
    identidade do cliente em vez do tenant."""

    def __init__(self, db: Session, client_account_id: uuid.UUID):
        self.db = db
        self.client_account_id = client_account_id

    def _scoped(self):
        return select(ClientFavorite).where(
            ClientFavorite.client_account_id == self.client_account_id
        )

    def list_all(self) -> list[ClientFavorite]:
        stmt = (
            self._scoped()
            .options(joinedload(ClientFavorite.tenant))
            .order_by(ClientFavorite.created_at.desc())
        )
        return list(self.db.execute(stmt).unique().scalars().all())

    def get_by_tenant(self, tenant_id: uuid.UUID) -> ClientFavorite | None:
        stmt = self._scoped().where(ClientFavorite.tenant_id == tenant_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def add(self, favorite: ClientFavorite) -> ClientFavorite:
        self.db.add(favorite)
        self.db.flush()
        return favorite

    def delete(self, favorite: ClientFavorite) -> None:
        self.db.delete(favorite)
        self.db.flush()
