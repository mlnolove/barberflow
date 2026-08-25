import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentClientDep
from app.db.session import get_db
from app.models.queue_entry import QueueEntry
from app.repositories.tenant_repository import TenantRepository
from app.schemas.employee import EmployeeSummary
from app.schemas.queue import (
    ClientQueueEntryRead,
    ClientQueueJoinRequest,
    QueueBarbershopSummary,
    QueueCancelRequest,
)
from app.schemas.service import ServiceSummary
from app.services import client_queue_service

router = APIRouter(prefix="/api/client/queue", tags=["client-queue"])


def _to_read(db: Session, entry: QueueEntry, position: int | None) -> ClientQueueEntryRead:
    tenant = TenantRepository(db).get_by_id(entry.tenant_id)
    return ClientQueueEntryRead(
        id=entry.id,
        barbershop=QueueBarbershopSummary(id=tenant.id, name=tenant.name, logo_url=tenant.logo_url),
        employee=EmployeeSummary.model_validate(entry.employee) if entry.employee else None,
        service=ServiceSummary.model_validate(entry.service),
        status=entry.status,
        position=position,
        joined_at=entry.joined_at,
        called_at=entry.called_at,
        started_at=entry.started_at,
        finished_at=entry.finished_at,
        cancellation_reason=entry.cancellation_reason,
    )


@router.post("", response_model=ClientQueueEntryRead, status_code=201)
def join_queue(
    payload: ClientQueueJoinRequest,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    entry = client_queue_service.join_queue(
        db, payload.tenant_id, current_client.client, payload.service_id, payload.employee_id
    )
    _, position = client_queue_service.get_my_position(db, current_client.client.id, entry.id)
    return _to_read(db, entry, position)


@router.get("", response_model=list[ClientQueueEntryRead])
def list_my_queue_entries(current_client: CurrentClientDep, db: Session = Depends(get_db)):
    entries = client_queue_service.list_my_queue_entries(db, current_client.client.id)
    return [_to_read(db, entry, position) for entry, position in entries]


@router.get("/{entry_id}", response_model=ClientQueueEntryRead)
def get_my_queue_entry(
    entry_id: uuid.UUID, current_client: CurrentClientDep, db: Session = Depends(get_db)
):
    entry, position = client_queue_service.get_my_position(db, current_client.client.id, entry_id)
    return _to_read(db, entry, position)


@router.post("/{entry_id}/cancel", response_model=ClientQueueEntryRead)
def cancel_my_queue_entry(
    entry_id: uuid.UUID,
    payload: QueueCancelRequest,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    entry = client_queue_service.cancel_my_queue_entry(
        db, current_client.client.id, entry_id, payload.reason
    )
    return _to_read(db, entry, None)
