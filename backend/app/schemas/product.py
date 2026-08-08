import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.schemas.supplier import SupplierSummary


class ProductCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    sku: str | None = Field(default=None, max_length=50)
    category: str | None = Field(default=None, max_length=100)
    description: str | None = None
    min_stock: int = Field(default=0, ge=0)
    cost_price: Decimal = Field(default=Decimal(0), ge=0)
    sale_price: Decimal = Field(ge=0)
    supplier_id: uuid.UUID | None = None
    initial_quantity: int = Field(default=0, ge=0)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    sku: str | None = Field(default=None, max_length=50)
    category: str | None = Field(default=None, max_length=100)
    description: str | None = None
    min_stock: int | None = Field(default=None, ge=0)
    cost_price: Decimal | None = Field(default=None, ge=0)
    sale_price: Decimal | None = Field(default=None, ge=0)
    supplier_id: uuid.UUID | None = None
    is_active: bool | None = None


class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    sku: str | None
    category: str | None
    description: str | None
    current_quantity: int
    min_stock: int
    cost_price: Decimal
    sale_price: Decimal
    supplier: SupplierSummary | None
    is_active: bool
    created_at: datetime

    @computed_field
    @property
    def is_low_stock(self) -> bool:
        return self.current_quantity <= self.min_stock
