import uuid

from pydantic import BaseModel, ConfigDict


class PaymentMethodRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    is_active: bool


class PaymentMethodUpdate(BaseModel):
    is_active: bool
