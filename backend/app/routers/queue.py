import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.queue_entry import QueueEntry
from app.schemas.customer import CustomerSummary
from app.schemas.employee import EmployeeSummary
from app.schemas.queue import (
    QueueCancelRequest,
    QueueCompleteRequest,
    QueueEntryCreate,
    QueueEntryRead,
)
from app.schemas.service import ServiceSummary
from app.services import queue_service

router = APIRouter(prefix="/api/queue", tags=["queue"])


def _to_read(entry: QueueEntry, position: int | None) -> QueueEntryRead:
    return QueueEntryRead(
        id=entry.id,
        customer=CustomerSummary.model_validate(entry.customer),
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


@router.get("", response_model=list[QueueEntryRead])
def list_queue(
    current_user: CurrentUser = Depends(require_permission("appointments.view")),
    db: Session = Depends(get_db),
):
    return [
        _to_read(entry, position)
        for entry, position in queue_service.list_queue(db, current_user.tenant_id)
    ]


@router.post("", response_model=QueueEntryRead, status_code=201)
def add_to_queue(
    payload: QueueEntryCreate,
    current_user: CurrentUser = Depends(require_permission("appointments.create")),
    db: Session = Depends(get_db),
):
    entry = queue_service.join_queue(
        db, current_user.tenant_id, payload.customer_id, payload.service_id, payload.employee_id
    )
    return _to_read(entry, queue_service.get_queue_entry(db, current_user.tenant_id, entry.id)[1])


@router.get("/{entry_id}", response_model=QueueEntryRead)
def get_queue_entry(
    entry_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("appointments.view")),
    db: Session = Depends(get_db),
):
    entry, position = queue_service.get_queue_entry(db, current_user.tenant_id, entry_id)
    return _to_read(entry, position)


@router.post("/call-next", response_model=QueueEntryRead)
def call_next(
    employee_id: uuid.UUID | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("appointments.confirm")),
    db: Session = Depends(get_db),
):
    entry = queue_service.call_next(db, current_user.tenant_id, employee_id)
    return _to_read(entry, None)


@router.post("/{entry_id}/start", response_model=QueueEntryRead)
def start_service(
    entry_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("appointments.start")),
    db: Session = Depends(get_db),
):
    entry = queue_service.start_service(db, current_user.tenant_id, entry_id)
    return _to_read(entry, None)


@router.post("/{entry_id}/complete", response_model=QueueEntryRead)
def complete_queue_entry(
    entry_id: uuid.UUID,
    payload: QueueCompleteRequest,
    current_user: CurrentUser = Depends(require_permission("appointments.complete")),
    db: Session = Depends(get_db),
):
    entry = queue_service.complete_queue_entry(
        db, current_user.tenant_id, current_user.user.id, entry_id, payload
    )
    return _to_read(entry, None)


@router.post("/{entry_id}/cancel", response_model=QueueEntryRead)
def cancel_queue_entry(
    entry_id: uuid.UUID,
    payload: QueueCancelRequest,
    current_user: CurrentUser = Depends(require_permission("appointments.cancel")),
    db: Session = Depends(get_db),
):
    entry = queue_service.cancel_queue_entry(db, current_user.tenant_id, entry_id, payload.reason)
    return _to_read(entry, None)


@router.post("/{entry_id}/no-show", response_model=QueueEntryRead)
def mark_no_show(
    entry_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("appointments.cancel")),
    db: Session = Depends(get_db),
):
    entry = queue_service.mark_no_show(db, current_user.tenant_id, entry_id)
    return _to_read(entry, None)
