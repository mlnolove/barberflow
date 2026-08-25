import re
import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.tenant import SchedulingMode

_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _validate_hex_color(value: str) -> str:
    if not _HEX_COLOR_RE.match(value):
        raise ValueError("Cor inválida. Use o formato hexadecimal, ex.: #0F172A.")
    return value.upper()


class TenantRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    logo_url: str | None
    description: str | None
    phone: str | None
    email: str | None
    address: str | None
    city: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    primary_color: str
    secondary_color: str
    onboarding_completed: bool
    appointment_buffer_minutes: int
    min_advance_minutes: int
    max_advance_days: int
    allow_cancellation: bool
    scheduling_mode: SchedulingMode
    auto_approve_appointments: bool
    cancellation_deadline_minutes: int | None


class TenantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    logo_url: str | None = Field(default=None, max_length=500)
    description: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=20)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    latitude: Decimal | None = Field(default=None, ge=-90, le=90)
    longitude: Decimal | None = Field(default=None, ge=-180, le=180)
    primary_color: str | None = None
    secondary_color: str | None = None
    appointment_buffer_minutes: int | None = Field(default=None, ge=0, le=120)
    min_advance_minutes: int | None = Field(default=None, ge=0, le=10080)
    max_advance_days: int | None = Field(default=None, ge=1, le=365)
    allow_cancellation: bool | None = None
    scheduling_mode: SchedulingMode | None = None
    auto_approve_appointments: bool | None = None
    cancellation_deadline_minutes: int | None = Field(default=None, ge=0, le=20160)

    @field_validator("primary_color", "secondary_color")
    @classmethod
    def _validate_colors(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _validate_hex_color(value)
