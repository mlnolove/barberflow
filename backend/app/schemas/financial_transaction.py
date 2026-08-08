import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.financial_transaction import FinancialTransactionType
from app.schemas.payment_method import PaymentMethodRead


class FinancialTransactionCreate(BaseModel):
    type: FinancialTransactionType
    category: str = Field(min_length=2, max_length=50)
    description: str = Field(min_length=2, max_length=255)
    amount: Decimal = Field(gt=0)
    transaction_date: date
    payment_method_id: uuid.UUID
    notes: str | None = None


class FinancialTransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: FinancialTransactionType
    category: str
    description: str
    amount: Decimal
    transaction_date: date
    payment_method: PaymentMethodRead
    responsible_user_id: uuid.UUID | None
    appointment_id: uuid.UUID | None
    reversal_of_id: uuid.UUID | None
    is_voided: bool
    notes: str | None
    created_at: datetime


class VoidTransactionRequest(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class FinancialSummary(BaseModel):
    period_start: date
    period_end: date
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    transaction_count: int
