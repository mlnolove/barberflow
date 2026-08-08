import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.appointment import (
    AppointmentCancel,
    AppointmentComplete,
    AppointmentCreate,
    AppointmentRead,
    AppointmentReschedule,
)
from app.services import appointment_service

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


@router.get("", response_model=list[AppointmentRead])
def list_appointments(
    start: datetime = Query(..., description="Início do intervalo (ISO 8601)"),
    end: datetime = Query(..., description="Fim do intervalo (ISO 8601)"),
    employee_id: uuid.UUID | None = Query(default=None),
    status: str | None = Query(default=None),
    current_user: CurrentUser = Depends(require_permission("appointments.view")),
    db: Session = Depends(get_db),
):
    return appointment_service.list_appointments(
        db,
        current_user.tenant_id,
        range_start=start,
        range_end=end,
        employee_id=employee_id,
        status=status,
    )


@router.post("", response_model=AppointmentRead, status_code=201)
def create_appointment(
    payload: AppointmentCreate,
    current_user: CurrentUser = Depends(require_permission("appointments.create")),
    db: Session = Depends(get_db),
):
    return appointment_service.create_appointment(db, current_user.tenant_id, payload)


@router.get("/{appointment_id}", response_model=AppointmentRead)
def get_appointment(
    appointment_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("appointments.view")),
    db: Session = Depends(get_db),
):
    return appointment_service.get_appointment(db, current_user.tenant_id, appointment_id)


@router.patch("/{appointment_id}/reschedule", response_model=AppointmentRead)
def reschedule_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentReschedule,
    current_user: CurrentUser = Depends(require_permission("appointments.edit")),
    db: Session = Depends(get_db),
):
    return appointment_service.reschedule_appointment(
        db, current_user.tenant_id, appointment_id, current_user.user.id, payload
    )


@router.post("/{appointment_id}/confirm", response_model=AppointmentRead)
def confirm_appointment(
    appointment_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("appointments.confirm")),
    db: Session = Depends(get_db),
):
    return appointment_service.confirm_appointment(
        db, current_user.tenant_id, appointment_id, current_user.user.id
    )


@router.post("/{appointment_id}/start", response_model=AppointmentRead)
def start_appointment(
    appointment_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("appointments.start")),
    db: Session = Depends(get_db),
):
    return appointment_service.start_appointment(
        db, current_user.tenant_id, appointment_id, current_user.user.id
    )


@router.post("/{appointment_id}/complete", response_model=AppointmentRead)
def complete_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentComplete,
    current_user: CurrentUser = Depends(require_permission("appointments.complete")),
    db: Session = Depends(get_db),
):
    return appointment_service.complete_appointment(
        db, current_user.tenant_id, appointment_id, current_user.user.id, payload
    )


@router.post("/{appointment_id}/cancel", response_model=AppointmentRead)
def cancel_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentCancel,
    current_user: CurrentUser = Depends(require_permission("appointments.cancel")),
    db: Session = Depends(get_db),
):
    return appointment_service.cancel_appointment(
        db, current_user.tenant_id, appointment_id, current_user.user.id, payload.reason
    )


@router.post("/{appointment_id}/no-show", response_model=AppointmentRead)
def mark_no_show(
    appointment_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("appointments.cancel")),
    db: Session = Depends(get_db),
):
    return appointment_service.mark_no_show(
        db, current_user.tenant_id, appointment_id, current_user.user.id
    )
