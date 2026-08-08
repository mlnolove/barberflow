import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.validators import normalize_br_phone


class SupplierCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    phone: str | None = None
    email: EmailStr | None = None
    notes: str | None = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_br_phone(value)


class SupplierUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    email: EmailStr | None = None
    notes: str | None = None
    is_active: bool | None = None

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_br_phone(value)


class SupplierRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    notes: str | None
    is_active: bool
    created_at: datetime


class SupplierSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
