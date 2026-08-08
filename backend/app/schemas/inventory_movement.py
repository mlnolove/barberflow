import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from app.models.inventory_movement import InventoryMovementType


class ManualMovementType(StrEnum):
    """Tipos que podem ser criados manualmente (ADJUSTMENT tem endpoint próprio)."""

    ENTRY = "ENTRY"
    EXIT = "EXIT"
    LOSS = "LOSS"
    SALE = "SALE"
    RETURN = "RETURN"


class StockMovementCreate(BaseModel):
    type: ManualMovementType
    quantity: int = Field(gt=0)
    reason: str = Field(min_length=3, max_length=500)


class StockAdjustmentCreate(BaseModel):
    new_quantity: int = Field(ge=0)
    reason: str = Field(min_length=3, max_length=500)


class InventoryMovementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    type: InventoryMovementType
    quantity_change: int
    quantity_before: int
    quantity_after: int
    reason: str
    created_by_user_id: uuid.UUID | None
    created_at: datetime
