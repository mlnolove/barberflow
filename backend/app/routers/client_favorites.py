import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentClientDep
from app.db.session import get_db
from app.schemas.client_favorite import ClientFavoriteCreate, ClientFavoriteRead
from app.services import client_favorite_service

router = APIRouter(prefix="/api/client/favorites", tags=["client-favorites"])


@router.get("", response_model=list[ClientFavoriteRead])
def list_favorites(current_client: CurrentClientDep, db: Session = Depends(get_db)):
    favorites = client_favorite_service.list_favorites(db, current_client.client.id)
    return [
        ClientFavoriteRead(
            tenant_id=f.tenant_id,
            name=f.tenant.name,
            logo_url=f.tenant.logo_url,
            city=f.tenant.city,
            created_at=f.created_at,
        )
        for f in favorites
    ]


@router.post("", status_code=201, response_model=ClientFavoriteRead)
def add_favorite(
    payload: ClientFavoriteCreate,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    favorite = client_favorite_service.add_favorite(db, current_client.client.id, payload.tenant_id)
    return ClientFavoriteRead(
        tenant_id=favorite.tenant_id,
        name=favorite.tenant.name,
        logo_url=favorite.tenant.logo_url,
        city=favorite.tenant.city,
        created_at=favorite.created_at,
    )


@router.delete("/{tenant_id}", status_code=204)
def remove_favorite(
    tenant_id: uuid.UUID,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    client_favorite_service.remove_favorite(db, current_client.client.id, tenant_id)
