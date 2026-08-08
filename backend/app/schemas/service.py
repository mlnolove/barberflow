import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ServiceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    price: Decimal = Field(ge=0)
    duration_minutes: int = Field(gt=0, le=600)
    category: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    price: Decimal | None = Field(default=None, ge=0)
    duration_minutes: int | None = Field(default=None, gt=0, le=600)
    category: str | None = Field(default=None, max_length=100)
    image_url: str | None = Field(default=None, max_length=500)
    is_active: bool | None = None


class ServiceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    price: Decimal
    duration_minutes: int
    category: str | None
    image_url: str | None
    is_active: bool
    created_at: datetime


class ServiceSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    price: Decimal
    duration_minutes: int
