import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.appointment import AppointmentStatus
from app.schemas.employee import EmployeeSummary
from app.schemas.service import ServiceSummary


class ClientAppointmentCreate(BaseModel):
    tenant_id: uuid.UUID
    employee_id: uuid.UUID
    service_id: uuid.UUID
    starts_at: datetime
    notes: str | None = Field(default=None, max_length=1000)


class ClientAppointmentCancel(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class BarbershopSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    logo_url: str | None


class ClientAppointmentRead(BaseModel):
    id: uuid.UUID
    barbershop: BarbershopSummary
    employee: EmployeeSummary
    service: ServiceSummary
    starts_at: datetime
    ends_at: datetime
    duration_minutes: int
    price: Decimal
    status: AppointmentStatus
    notes: str | None
    cancellation_reason: str | None
    created_at: datetime
