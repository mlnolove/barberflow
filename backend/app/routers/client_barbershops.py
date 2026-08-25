import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.availability import AvailabilityResponse, AvailabilitySlot
from app.schemas.barbershop_public import BarbershopDetail, BarbershopSearchResponse
from app.schemas.employee import EmployeeSummary
from app.services import availability_service, barbershop_discovery_service

router = APIRouter(prefix="/api/client/barbershops", tags=["client-barbershops"])


@router.get("", response_model=BarbershopSearchResponse)
def search_barbershops(
    q: str | None = Query(default=None, description="Nome, cidade, serviço ou barbeiro"),
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    radius_km: float | None = Query(default=None, gt=0, le=200),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    items, total = barbershop_discovery_service.search_barbershops(
        db,
        query=q,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        page=page,
        limit=limit,
    )
    return BarbershopSearchResponse(items=items, total=total, page=page, limit=limit)


@router.get("/{tenant_id}", response_model=BarbershopDetail)
def get_barbershop(tenant_id: uuid.UUID, db: Session = Depends(get_db)):
    return barbershop_discovery_service.get_barbershop_detail(db, tenant_id)


@router.get("/{tenant_id}/barbers", response_model=list[EmployeeSummary])
def list_barbers(
    tenant_id: uuid.UUID,
    service_id: uuid.UUID | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return barbershop_discovery_service.list_barbershop_barbers(
        db, tenant_id, service_id=service_id
    )


@router.get("/{tenant_id}/availability", response_model=AvailabilityResponse)
def get_availability(
    tenant_id: uuid.UUID,
    employee_id: uuid.UUID = Query(...),
    service_id: uuid.UUID = Query(...),
    day: date = Query(..., alias="date"),
    db: Session = Depends(get_db),
):
    slots = availability_service.list_available_slots(
        db, tenant_id, employee_id=employee_id, service_id=service_id, day=day
    )
    return AvailabilityResponse(
        date=day.isoformat(),
        employee_id=str(employee_id),
        service_id=str(service_id),
        slots=[AvailabilitySlot(starts_at=s, ends_at=e) for s, e in slots],
    )
