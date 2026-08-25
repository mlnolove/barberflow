import json
import uuid

from sqlalchemy.orm import Session

from app.core.crypto import decrypt_field, encrypt_field
from app.models.financial_account import FinancialAccount, FinancialAccountType
from app.repositories.financial_account_repository import FinancialAccountRepository
from app.schemas.financial_account import FinancialAccountRead, FinancialAccountUpsert
from app.services import audit_service


def _mask(value: str) -> str:
    if len(value) <= 4:
        return "•" * len(value)
    return "•" * (len(value) - 4) + value[-4:]


def _to_read(account: FinancialAccount) -> FinancialAccountRead:
    details = json.loads(decrypt_field(account.encrypted_details))
    if account.account_type == FinancialAccountType.PIX:
        masked = f"PIX {_mask(details['pix_key'])}"
    else:
        masked = (
            f"{details['bank_code']} ag. {details['agency']} cc. {_mask(details['account_number'])}"
        )
    return FinancialAccountRead(
        account_type=account.account_type,
        holder_name=account.holder_name,
        masked_detail=masked,
        updated_at=account.updated_at,
    )


def get_financial_account(db: Session, tenant_id: uuid.UUID) -> FinancialAccountRead | None:
    account = FinancialAccountRepository(db, tenant_id).get_current()
    if account is None:
        return None
    return _to_read(account)


def upsert_financial_account(
    db: Session, tenant_id: uuid.UUID, user_id: uuid.UUID, payload: FinancialAccountUpsert
) -> FinancialAccountRead:
    if payload.account_type == FinancialAccountType.PIX:
        details = {"pix_key": payload.pix_key}
    else:
        details = {
            "bank_code": payload.bank_code,
            "agency": payload.agency,
            "account_number": payload.account_number,
        }
    encrypted = encrypt_field(json.dumps(details))

    repo = FinancialAccountRepository(db, tenant_id)
    account = repo.get_current()
    if account is None:
        account = repo.add(
            FinancialAccount(
                account_type=payload.account_type,
                holder_name=payload.holder_name,
                encrypted_details=encrypted,
            )
        )
    else:
        account.account_type = payload.account_type
        account.holder_name = payload.holder_name
        account.encrypted_details = encrypted

    audit_service.log_user_action(
        db,
        tenant_id=tenant_id,
        user_id=user_id,
        action="financial_account.upsert",
        resource_type="financial_account",
        resource_id=account.id,
    )
    db.commit()
    return _to_read(account)
