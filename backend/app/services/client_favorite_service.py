import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.client_favorite import ClientFavorite
from app.repositories.client_favorite_repository import ClientFavoriteRepository
from app.repositories.tenant_repository import TenantRepository


def list_favorites(db: Session, client_account_id: uuid.UUID) -> list[ClientFavorite]:
    return ClientFavoriteRepository(db, client_account_id).list_all()


def add_favorite(db: Session, client_account_id: uuid.UUID, tenant_id: uuid.UUID) -> ClientFavorite:
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is None or not tenant.is_active:
        raise NotFoundError("Barbearia não encontrada.")

    repo = ClientFavoriteRepository(db, client_account_id)
    if repo.get_by_tenant(tenant_id) is not None:
        raise ConflictError("Esta barbearia já está nos favoritos.")

    favorite = repo.add(ClientFavorite(client_account_id=client_account_id, tenant_id=tenant_id))
    db.commit()
    return favorite


def remove_favorite(db: Session, client_account_id: uuid.UUID, tenant_id: uuid.UUID) -> None:
    repo = ClientFavoriteRepository(db, client_account_id)
    favorite = repo.get_by_tenant(tenant_id)
    if favorite is None:
        raise NotFoundError("Favorito não encontrado.")
    repo.delete(favorite)
    db.commit()
