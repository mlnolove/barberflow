import uuid
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.financial_transaction import FinancialTransactionType
from app.schemas.common import Page
from app.schemas.financial_transaction import (
    FinancialSummary,
    FinancialTransactionCreate,
    FinancialTransactionRead,
    VoidTransactionRequest,
)
from app.schemas.payment_method import PaymentMethodRead, PaymentMethodUpdate
from app.services import financial_service, payment_method_service

router = APIRouter(prefix="/api/financial", tags=["financial"])


@router.get("/payment-methods", response_model=list[PaymentMethodRead])
def list_payment_methods(
    current_user: CurrentUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
):
    return payment_method_service.list_payment_methods(db, current_user.tenant_id)


@router.patch("/payment-methods/{payment_method_id}", response_model=PaymentMethodRead)
def update_payment_method(
    payment_method_id: uuid.UUID,
    payload: PaymentMethodUpdate,
    current_user: CurrentUser = Depends(require_permission("finance.edit")),
    db: Session = Depends(get_db),
):
    return payment_method_service.set_payment_method_active(
        db, current_user.tenant_id, payment_method_id, payload.is_active
    )


@router.get("/transactions", response_model=Page[FinancialTransactionRead])
def list_transactions(
    type: FinancialTransactionType | None = Query(default=None),
    category: str | None = Query(default=None),
    payment_method_id: uuid.UUID | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
):
    items, total = financial_service.list_transactions(
        db,
        current_user.tenant_id,
        type_=type,
        category=category,
        payment_method_id=payment_method_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )
    return Page(items=items, total=total, page=page, limit=limit)


@router.get("/summary", response_model=FinancialSummary)
def get_summary(
    date_from: date = Query(...),
    date_to: date = Query(...),
    current_user: CurrentUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
):
    return financial_service.get_summary(
        db, current_user.tenant_id, date_from=date_from, date_to=date_to
    )


@router.post("/transactions", response_model=FinancialTransactionRead, status_code=201)
def create_transaction(
    payload: FinancialTransactionCreate,
    current_user: CurrentUser = Depends(require_permission("finance.create")),
    db: Session = Depends(get_db),
):
    return financial_service.create_transaction(
        db, current_user.tenant_id, current_user.user.id, payload
    )


@router.get("/transactions/{transaction_id}", response_model=FinancialTransactionRead)
def get_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db),
):
    return financial_service.get_transaction(db, current_user.tenant_id, transaction_id)


@router.post("/transactions/{transaction_id}/void", response_model=FinancialTransactionRead)
def void_transaction(
    transaction_id: uuid.UUID,
    payload: VoidTransactionRequest,
    current_user: CurrentUser = Depends(require_permission("finance.edit")),
    db: Session = Depends(get_db),
):
    return financial_service.void_transaction(
        db, current_user.tenant_id, current_user.user.id, transaction_id, payload.reason
    )
