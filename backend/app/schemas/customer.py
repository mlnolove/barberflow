import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validators import normalize_br_phone


class CustomerCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    phone: str
    email: EmailStr | None = None
    birth_date: date | None = None
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str) -> str:
        return normalize_br_phone(value)


class CustomerUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    email: EmailStr | None = None
    birth_date: date | None = None
    address: str | None = Field(default=None, max_length=255)
    notes: str | None = None
    is_active: bool | None = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_br_phone(value)


class CustomerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None
    email: str | None
    birth_date: date | None
    address: str | None
    notes: str | None
    is_active: bool
    created_at: datetime


class CustomerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None
