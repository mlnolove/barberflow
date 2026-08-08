import uuid
from datetime import datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.validators import normalize_br_phone
from app.schemas.service import ServiceSummary


class EmployeeCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    phone: str
    email: EmailStr | None = None
    role_title: str | None = Field(default=None, max_length=100)
    specialties: list[str] = Field(default_factory=list)
    commission_percentage: Decimal = Field(default=Decimal(0), ge=0, le=100)
    work_start_time: time | None = None
    work_end_time: time | None = None
    work_days: list[int] = Field(default_factory=list)
    service_ids: list[uuid.UUID] = Field(default_factory=list)
    user_id: uuid.UUID | None = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return normalize_br_phone(value)

    @field_validator("work_days")
    @classmethod
    def _validate_work_days(cls, value: list[int]) -> list[int]:
        if any(day < 0 or day > 6 for day in value):
            raise ValueError("Dias da semana devem estar entre 0 (segunda) e 6 (domingo).")
        return value

    @model_validator(mode="after")
    def _validate_work_period(self) -> "EmployeeCreate":
        if (
            self.work_start_time
            and self.work_end_time
            and self.work_end_time <= self.work_start_time
        ):
            raise ValueError("O horário final deve ser depois do horário inicial.")
        return self


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    email: EmailStr | None = None
    role_title: str | None = Field(default=None, max_length=100)
    specialties: list[str] | None = None
    commission_percentage: Decimal | None = Field(default=None, ge=0, le=100)
    work_start_time: time | None = None
    work_end_time: time | None = None
    work_days: list[int] | None = None
    service_ids: list[uuid.UUID] | None = None
    user_id: uuid.UUID | None = None
    is_active: bool | None = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_br_phone(value)

    @field_validator("work_days")
    @classmethod
    def _validate_work_days(cls, value: list[int] | None) -> list[int] | None:
        if value and any(day < 0 or day > 6 for day in value):
            raise ValueError("Dias da semana devem estar entre 0 (segunda) e 6 (domingo).")
        return value


class EmployeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID | None
    full_name: str
    phone: str
    email: str | None
    role_title: str | None
    specialties: list[str]
    commission_percentage: Decimal
    work_start_time: time | None
    work_end_time: time | None
    work_days: list[int]
    is_active: bool
    created_at: datetime
    services: list[ServiceSummary] = Field(default_factory=list)


class EmployeeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    role_title: str | None
