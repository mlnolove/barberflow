import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.validators import normalize_br_phone


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    phone: str | None
    avatar_url: str | None
    created_at: datetime


class ClientProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    phone: str | None = None
    # Alto o bastante para um data URI base64 (foto redimensionada no
    # cliente pra no máximo 480px antes de enviar).
    avatar_url: str | None = Field(default=None, max_length=2_000_000)

    @field_validator("phone")
    @classmethod
    def _validate_phone(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return normalize_br_phone(value)


class ClientLocationUpdate(BaseModel):
    latitude: Decimal = Field(ge=-90, le=90)
    longitude: Decimal = Field(ge=-180, le=180)
