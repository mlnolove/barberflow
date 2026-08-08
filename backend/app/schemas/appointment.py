import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.appointment import AppointmentStatus
from app.schemas.customer import CustomerSummary
from app.schemas.employee import EmployeeSummary
from app.schemas.service import ServiceSummary


class AppointmentCreate(BaseModel):
    customer_id: uuid.UUID
    employee_id: uuid.UUID
    service_id: uuid.UUID
    starts_at: datetime
    notes: str | None = None


class AppointmentReschedule(BaseModel):
    starts_at: datetime
    employee_id: uuid.UUID | None = None


class AppointmentCancel(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class ProductSaleItem(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0)


class AppointmentComplete(BaseModel):
    price: Decimal | None = Field(default=None, ge=0)
    payment_method_code: str
    products_sold: list[ProductSaleItem] = Field(default_factory=list)


class AppointmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    customer: CustomerSummary
    employee: EmployeeSummary
    service: ServiceSummary
    starts_at: datetime
    ends_at: datetime
    duration_minutes: int
    price: Decimal
    payment_method: str | None
    status: AppointmentStatus
    notes: str | None
    cancellation_reason: str | None
    created_at: datetime


class AppointmentStatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    from_status: AppointmentStatus
    to_status: AppointmentStatus
    reason: str | None
    changed_by_user_id: uuid.UUID | None
    created_at: datetime
