import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.models.queue_entry import QueueStatus
from app.schemas.customer import CustomerSummary
from app.schemas.employee import EmployeeSummary
from app.schemas.service import ServiceSummary


class QueueEntryCreate(BaseModel):
    """Uso da equipe — cliente sem app que chega andando na barbearia."""

    customer_id: uuid.UUID
    service_id: uuid.UUID
    employee_id: uuid.UUID | None = None


class QueueCancelRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class QueueCompleteRequest(BaseModel):
    payment_method_code: str
    price: Decimal | None = Field(default=None, ge=0)


class QueueEntryRead(BaseModel):
    id: uuid.UUID
    customer: CustomerSummary
    employee: EmployeeSummary | None
    service: ServiceSummary
    status: QueueStatus
    position: int | None
    """`None` quando o status já não é `WAITING` — a posição só faz sentido
    para quem ainda está esperando."""
    joined_at: datetime
    called_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    cancellation_reason: str | None


class ClientQueueJoinRequest(BaseModel):
    tenant_id: uuid.UUID
    service_id: uuid.UUID
    employee_id: uuid.UUID | None = None


class QueueBarbershopSummary(BaseModel):
    id: uuid.UUID
    name: str
    logo_url: str | None


class ClientQueueEntryRead(BaseModel):
    id: uuid.UUID
    barbershop: QueueBarbershopSummary
    employee: EmployeeSummary | None
    service: ServiceSummary
    status: QueueStatus
    position: int | None
    joined_at: datetime
    called_at: datetime | None
    started_at: datetime | None
    finished_at: datetime | None
    cancellation_reason: str | None
