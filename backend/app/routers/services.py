import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.service import ServiceCreate, ServiceRead, ServiceUpdate
from app.services import catalog_service

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=Page[ServiceRead])
def list_services(
    q: str | None = Query(default=None, description="Busca por nome ou categoria"),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("services.view")),
    db: Session = Depends(get_db),
):
    items, total = catalog_service.list_services(
        db, current_user.tenant_id, query=q, is_active=is_active, page=page, limit=limit
    )
    return Page(items=items, total=total, page=page, limit=limit)


@router.post("", response_model=ServiceRead, status_code=201)
def create_service(
    payload: ServiceCreate,
    current_user: CurrentUser = Depends(require_permission("services.create")),
    db: Session = Depends(get_db),
):
    return catalog_service.create_service(db, current_user.tenant_id, payload)


@router.get("/{service_id}", response_model=ServiceRead)
def get_service(
    service_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("services.view")),
    db: Session = Depends(get_db),
):
    return catalog_service.get_service(db, current_user.tenant_id, service_id)


@router.patch("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: uuid.UUID,
    payload: ServiceUpdate,
    current_user: CurrentUser = Depends(require_permission("services.edit")),
    db: Session = Depends(get_db),
):
    return catalog_service.update_service(db, current_user.tenant_id, service_id, payload)


@router.post("/{service_id}/deactivate", response_model=ServiceRead)
def deactivate_service(
    service_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("services.delete")),
    db: Session = Depends(get_db),
):
    return catalog_service.deactivate_service(db, current_user.tenant_id, service_id)


@router.post("/{service_id}/reactivate", response_model=ServiceRead)
def reactivate_service(
    service_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("services.edit")),
    db: Session = Depends(get_db),
):
    return catalog_service.reactivate_service(db, current_user.tenant_id, service_id)
