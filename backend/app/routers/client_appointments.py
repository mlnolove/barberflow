import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentClientDep
from app.db.session import get_db
from app.schemas.client_appointment import (
    ClientAppointmentCancel,
    ClientAppointmentCreate,
    ClientAppointmentRead,
)
from app.services import client_appointment_service

router = APIRouter(prefix="/api/client/appointments", tags=["client-appointments"])


@router.post("", response_model=ClientAppointmentRead, status_code=201)
def book_appointment(
    payload: ClientAppointmentCreate,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    appointment = client_appointment_service.book_appointment(db, current_client.client, payload)
    return client_appointment_service.to_read_model(db, appointment)


@router.get("", response_model=list[ClientAppointmentRead])
def list_my_appointments(
    current_client: CurrentClientDep,
    scope: Literal["upcoming", "history", "all"] = Query(default="upcoming"),
    db: Session = Depends(get_db),
):
    appointments = client_appointment_service.list_my_appointments(
        db, current_client.client.id, scope
    )
    return [client_appointment_service.to_read_model(db, a) for a in appointments]


@router.get("/{appointment_id}", response_model=ClientAppointmentRead)
def get_my_appointment(
    appointment_id: uuid.UUID,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    appointment = client_appointment_service.get_my_appointment(
        db, current_client.client.id, appointment_id
    )
    return client_appointment_service.to_read_model(db, appointment)


@router.post("/{appointment_id}/cancel", response_model=ClientAppointmentRead)
def cancel_my_appointment(
    appointment_id: uuid.UUID,
    payload: ClientAppointmentCancel,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    appointment = client_appointment_service.cancel_my_appointment(
        db, current_client.client.id, appointment_id, payload.reason
    )
    return client_appointment_service.to_read_model(db, appointment)
