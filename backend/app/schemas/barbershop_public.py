import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.tenant import SchedulingMode
from app.schemas.employee import EmployeeSummary
from app.schemas.scheduling import BusinessHoursRead
from app.schemas.service import ServiceRead


class TenantPhotoCreate(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    position: int = Field(default=0, ge=0, le=1000)


class TenantPhotoRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    position: int


class BarbershopCard(BaseModel):
    """Resultado de busca — dados públicos, nunca inclui nada financeiro ou
    de configuração interna da barbearia."""

    id: uuid.UUID
    name: str
    city: str | None
    logo_url: str | None
    distance_km: float | None
    min_price: Decimal | None
    max_price: Decimal | None
    is_open_now: bool | None


class BarbershopSearchResponse(BaseModel):
    items: list[BarbershopCard]
    total: int
    page: int
    limit: int


class BarbershopDetail(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    address: str | None
    city: str | None
    phone: str | None
    latitude: Decimal | None
    longitude: Decimal | None
    logo_url: str | None
    scheduling_mode: SchedulingMode
    photos: list[TenantPhotoRead]
    services: list[ServiceRead]
    barbers: list[EmployeeSummary]
    business_hours: list[BusinessHoursRead]
