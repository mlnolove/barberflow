import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.business_hours import BusinessHours
from app.models.service import Service
from app.repositories.barbershop_search_repository import BarbershopSearchRepository
from app.repositories.business_hours_repository import BusinessHoursRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.tenant_photo_repository import TenantPhotoRepository
from app.repositories.tenant_repository import TenantRepository
from app.schemas.barbershop_public import BarbershopCard, BarbershopDetail, TenantPhotoRead
from app.schemas.employee import EmployeeSummary
from app.schemas.scheduling import BusinessHoursRead
from app.schemas.service import ServiceRead


def _is_open_now(db: Session, tenant_ids: list[uuid.UUID]) -> dict[uuid.UUID, bool]:
    if not tenant_ids:
        return {}
    now = datetime.now(UTC)
    stmt = select(BusinessHours).where(
        BusinessHours.tenant_id.in_(tenant_ids), BusinessHours.weekday == now.weekday()
    )
    result: dict[uuid.UUID, bool] = {}
    for bh in db.execute(stmt).scalars().all():
        is_within_hours = (
            bh.open_time is not None
            and bh.close_time is not None
            and bh.open_time <= now.time() <= bh.close_time
        )
        result[bh.tenant_id] = bool(bh.is_open and is_within_hours)
    return result


def search_barbershops(
    db: Session,
    *,
    query: str | None,
    latitude: float | None,
    longitude: float | None,
    radius_km: float | None,
    page: int,
    limit: int,
) -> tuple[list[BarbershopCard], int]:
    results, total = BarbershopSearchRepository(db).search(
        query=query,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
        page=page,
        limit=limit,
    )
    open_map = _is_open_now(db, [r.tenant.id for r in results])
    cards = [
        BarbershopCard(
            id=r.tenant.id,
            name=r.tenant.name,
            city=r.tenant.city,
            logo_url=r.tenant.logo_url,
            distance_km=round(r.distance_km, 2) if r.distance_km is not None else None,
            min_price=r.min_price,
            max_price=r.max_price,
            is_open_now=open_map.get(r.tenant.id),
        )
        for r in results
    ]
    return cards, total


def get_barbershop_detail(db: Session, tenant_id: uuid.UUID) -> BarbershopDetail:
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is None or not tenant.is_active:
        raise NotFoundError("Barbearia não encontrada.")

    photos = TenantPhotoRepository(db, tenant_id).list_ordered()
    services = list(
        db.execute(
            select(Service)
            .where(Service.tenant_id == tenant_id, Service.is_active.is_(True))
            .order_by(Service.name)
        )
        .scalars()
        .all()
    )
    business_hours = sorted(
        BusinessHoursRepository(db, tenant_id).list_all(), key=lambda bh: bh.weekday
    )
    employees, _ = EmployeeRepository(db, tenant_id).search(is_active=True, limit=200)

    return BarbershopDetail(
        id=tenant.id,
        name=tenant.name,
        description=tenant.description,
        address=tenant.address,
        city=tenant.city,
        phone=tenant.phone,
        latitude=tenant.latitude,
        longitude=tenant.longitude,
        logo_url=tenant.logo_url,
        scheduling_mode=tenant.scheduling_mode,
        photos=[TenantPhotoRead.model_validate(p) for p in photos],
        services=[ServiceRead.model_validate(s) for s in services],
        barbers=[EmployeeSummary.model_validate(e) for e in employees],
        business_hours=[BusinessHoursRead.model_validate(bh) for bh in business_hours],
    )


def list_barbershop_barbers(
    db: Session, tenant_id: uuid.UUID, *, service_id: uuid.UUID | None
) -> list[EmployeeSummary]:
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is None or not tenant.is_active:
        raise NotFoundError("Barbearia não encontrada.")

    employees, _ = EmployeeRepository(db, tenant_id).search(is_active=True, limit=200)
    if service_id is not None:
        employees = [
            e for e in employees if any(link.service_id == service_id for link in e.services)
        ]
    return [EmployeeSummary.model_validate(e) for e in employees]
