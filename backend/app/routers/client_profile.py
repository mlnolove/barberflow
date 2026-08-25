from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentClientDep
from app.db.session import get_db
from app.schemas.client_profile import ClientLocationUpdate, ClientProfileUpdate, ClientRead
from app.services import client_profile_service

router = APIRouter(prefix="/api/client/me", tags=["client-profile"])


@router.get("", response_model=ClientRead)
def get_profile(current_client: CurrentClientDep):
    return ClientRead.model_validate(current_client.client)


@router.patch("", response_model=ClientRead)
def update_profile(
    payload: ClientProfileUpdate,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    client = client_profile_service.update_profile(db, current_client.client.id, payload)
    return ClientRead.model_validate(client)


@router.patch("/location", response_model=ClientRead)
def update_location(
    payload: ClientLocationUpdate,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    client = client_profile_service.update_location(db, current_client.client.id, payload)
    return ClientRead.model_validate(client)
