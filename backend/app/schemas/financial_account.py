from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.financial_account import FinancialAccountType


class FinancialAccountUpsert(BaseModel):
    account_type: FinancialAccountType
    holder_name: str = Field(min_length=2, max_length=150)
    pix_key: str | None = Field(default=None, max_length=140)
    bank_code: str | None = Field(default=None, max_length=10)
    agency: str | None = Field(default=None, max_length=20)
    account_number: str | None = Field(default=None, max_length=30)

    @model_validator(mode="after")
    def _validate_required_fields(self) -> "FinancialAccountUpsert":
        if self.account_type == FinancialAccountType.PIX and not self.pix_key:
            raise ValueError("Informe a chave PIX.")
        if self.account_type == FinancialAccountType.BANK_ACCOUNT and not all(
            [self.bank_code, self.agency, self.account_number]
        ):
            raise ValueError("Informe banco, agência e conta para recebimento por conta bancária.")
        return self


class FinancialAccountRead(BaseModel):
    """Nunca inclui a chave PIX/dados bancários em texto puro — nem para o
    próprio dono. `masked_detail` só confirma qual conta está cadastrada."""

    account_type: FinancialAccountType
    holder_name: str
    masked_detail: str
    updated_at: datetime
