from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.core.exceptions import NotFoundError
from app.db.session import get_db
from app.schemas.financial_account import FinancialAccountRead, FinancialAccountUpsert
from app.services import financial_account_service

router = APIRouter(prefix="/api/financial-account", tags=["financial-account"])


@router.get("", response_model=FinancialAccountRead)
def get_financial_account(
    current_user: CurrentUser = Depends(require_permission("settings.view")),
    db: Session = Depends(get_db),
):
    account = financial_account_service.get_financial_account(db, current_user.tenant_id)
    if account is None:
        raise NotFoundError("Nenhuma conta de recebimento cadastrada.")
    return account


@router.put("", response_model=FinancialAccountRead)
def upsert_financial_account(
    payload: FinancialAccountUpsert,
    current_user: CurrentUser = Depends(require_permission("settings.edit")),
    db: Session = Depends(get_db),
):
    return financial_account_service.upsert_financial_account(
        db, current_user.tenant_id, current_user.user.id, payload
    )
