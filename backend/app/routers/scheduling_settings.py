import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.models.tenant_photo import TenantPhoto
from app.repositories.tenant_photo_repository import TenantPhotoRepository
from app.schemas.barbershop_public import TenantPhotoCreate, TenantPhotoRead
from app.schemas.scheduling import (
    BlockedDateCreate,
    BlockedDateRead,
    BusinessHoursRead,
    BusinessHoursUpdate,
)
from app.schemas.tenant import TenantRead, TenantUpdate
from app.services import scheduling_settings_service, tenant_service

router = APIRouter(prefix="/api/settings", tags=["scheduling-settings"])


@router.get("/tenant", response_model=TenantRead)
def get_tenant_settings(
    current_user: CurrentUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    return tenant_service.get_tenant(db, current_user.tenant_id)


@router.patch("/tenant", response_model=TenantRead)
def update_tenant_settings(
    payload: TenantUpdate,
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    return tenant_service.update_tenant(db, current_user.tenant_id, payload)


@router.get("/business-hours", response_model=list[BusinessHoursRead])
def list_business_hours(
    current_user: CurrentUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    return scheduling_settings_service.list_business_hours(db, current_user.tenant_id)


@router.patch("/business-hours/{weekday}", response_model=BusinessHoursRead)
def update_business_hours(
    weekday: int,
    payload: BusinessHoursUpdate,
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    return scheduling_settings_service.update_business_hours(
        db, current_user.tenant_id, weekday, payload
    )


@router.get("/blocked-dates", response_model=list[BlockedDateRead])
def list_blocked_dates(
    current_user: CurrentUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    return scheduling_settings_service.list_blocked_dates(db, current_user.tenant_id)


@router.post("/blocked-dates", response_model=BlockedDateRead, status_code=201)
def create_blocked_date(
    payload: BlockedDateCreate,
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    return scheduling_settings_service.create_blocked_date(db, current_user.tenant_id, payload)


@router.delete("/blocked-dates/{blocked_date_id}", status_code=204)
def delete_blocked_date(
    blocked_date_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    scheduling_settings_service.delete_blocked_date(db, current_user.tenant_id, blocked_date_id)


@router.get("/photos", response_model=list[TenantPhotoRead])
def list_photos(
    current_user: CurrentUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    return TenantPhotoRepository(db, current_user.tenant_id).list_ordered()


@router.post("/photos", response_model=TenantPhotoRead, status_code=201)
def add_photo(
    payload: TenantPhotoCreate,
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    photo = TenantPhotoRepository(db, current_user.tenant_id).add(
        TenantPhoto(url=payload.url, position=payload.position)
    )
    db.commit()
    return photo


@router.delete("/photos/{photo_id}", status_code=204)
def delete_photo(
    photo_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    deleted = TenantPhotoRepository(db, current_user.tenant_id).delete_by_id(photo_id)
    if not deleted:
        raise NotFoundError("Foto não encontrada.")
    db.commit()
