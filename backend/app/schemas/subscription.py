import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.payment import PaymentPurpose, PaymentStatus
from app.models.subscription import BillingInterval, SubscriptionStatus


class SubscriptionPlanRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    name: str
    billing_interval: BillingInterval
    price: Decimal
    trial_days: int


class SubscriptionCreate(BaseModel):
    plan_code: str


class SubscriptionRead(BaseModel):
    id: uuid.UUID
    plan: SubscriptionPlanRead
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    cancelled_at: datetime | None


class CheckoutResponse(BaseModel):
    payment_id: uuid.UUID
    checkout_url: str | None
    status: str


class PaymentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    purpose: PaymentPurpose
    amount: Decimal
    status: PaymentStatus
    gateway: str | None
    paid_at: datetime | None
    created_at: datetime
