import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.service import Service
from app.repositories.service_repository import ServiceRepository
from app.schemas.service import ServiceCreate, ServiceUpdate


def list_services(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    query: str | None,
    is_active: bool | None,
    page: int,
    limit: int,
) -> tuple[list[Service], int]:
    repo = ServiceRepository(db, tenant_id)
    return repo.search(query=query, is_active=is_active, page=page, limit=limit)


def get_service(db: Session, tenant_id: uuid.UUID, service_id: uuid.UUID) -> Service:
    repo = ServiceRepository(db, tenant_id)
    service = repo.get_by_id(service_id)
    if service is None:
        raise NotFoundError("Serviço não encontrado.")
    return service


def create_service(db: Session, tenant_id: uuid.UUID, payload: ServiceCreate) -> Service:
    repo = ServiceRepository(db, tenant_id)
    service = repo.add(Service(**payload.model_dump()))
    db.commit()
    return service


def update_service(
    db: Session, tenant_id: uuid.UUID, service_id: uuid.UUID, payload: ServiceUpdate
) -> Service:
    service = get_service(db, tenant_id, service_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    db.commit()
    return service


def deactivate_service(db: Session, tenant_id: uuid.UUID, service_id: uuid.UUID) -> Service:
    service = get_service(db, tenant_id, service_id)
    service.is_active = False
    db.commit()
    return service


def reactivate_service(db: Session, tenant_id: uuid.UUID, service_id: uuid.UUID) -> Service:
    service = get_service(db, tenant_id, service_id)
    service.is_active = True
    db.commit()
    return service
