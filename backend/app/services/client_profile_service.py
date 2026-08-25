import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.models.client_account import ClientAccount
from app.repositories.client_account_repository import ClientAccountRepository
from app.schemas.client_profile import ClientLocationUpdate, ClientProfileUpdate


def update_profile(
    db: Session, client_account_id: uuid.UUID, payload: ClientProfileUpdate
) -> ClientAccount:
    client = ClientAccountRepository(db).get_by_id(client_account_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(client, field, value)
    db.commit()
    return client


def update_location(
    db: Session, client_account_id: uuid.UUID, payload: ClientLocationUpdate
) -> ClientAccount:
    """Só é chamado quando o app tem permissão de geolocalização concedida
    pelo usuário — nunca coletada por padrão no cadastro/login."""
    client = ClientAccountRepository(db).get_by_id(client_account_id)
    client.latitude = payload.latitude
    client.longitude = payload.longitude
    client.location_updated_at = datetime.now(UTC)
    db.commit()
    return client
