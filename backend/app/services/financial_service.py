import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import DomainError, NotFoundError
from app.models.financial_transaction import FinancialTransaction, FinancialTransactionType
from app.repositories.financial_transaction_repository import FinancialTransactionRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.schemas.financial_transaction import FinancialSummary, FinancialTransactionCreate
from app.services import audit_service

_OPPOSITE_TYPE = {
    FinancialTransactionType.INCOME: FinancialTransactionType.EXPENSE,
    FinancialTransactionType.EXPENSE: FinancialTransactionType.INCOME,
}


def get_transaction(
    db: Session, tenant_id: uuid.UUID, transaction_id: uuid.UUID
) -> FinancialTransaction:
    transaction = FinancialTransactionRepository(db, tenant_id).get_by_id(transaction_id)
    if transaction is None:
        raise NotFoundError("Transação financeira não encontrada.")
    return transaction


def list_transactions(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    type_: FinancialTransactionType | None,
    category: str | None,
    payment_method_id: uuid.UUID | None,
    date_from: date | None,
    date_to: date | None,
    page: int,
    limit: int,
) -> tuple[list[FinancialTransaction], int]:
    repo = FinancialTransactionRepository(db, tenant_id)
    return repo.search(
        type_=type_,
        category=category,
        payment_method_id=payment_method_id,
        date_from=date_from,
        date_to=date_to,
        page=page,
        limit=limit,
    )


def get_summary(
    db: Session, tenant_id: uuid.UUID, *, date_from: date, date_to: date
) -> FinancialSummary:
    repo = FinancialTransactionRepository(db, tenant_id)
    totals = repo.summary(date_from=date_from, date_to=date_to)
    return FinancialSummary(period_start=date_from, period_end=date_to, **totals)


def create_transaction(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID | None,
    payload: FinancialTransactionCreate,
    *,
    appointment_id: uuid.UUID | None = None,
    commit: bool = True,
) -> FinancialTransaction:
    payment_method = PaymentMethodRepository(db, tenant_id).get_by_id(payload.payment_method_id)
    if payment_method is None:
        raise NotFoundError("Forma de pagamento não encontrada.")
    if not payment_method.is_active:
        raise DomainError("Esta forma de pagamento está desativada.")

    repo = FinancialTransactionRepository(db, tenant_id)
    transaction = repo.add(
        FinancialTransaction(
            type=payload.type,
            category=payload.category,
            description=payload.description,
            amount=payload.amount,
            transaction_date=payload.transaction_date,
            payment_method_id=payload.payment_method_id,
            responsible_user_id=user_id,
            appointment_id=appointment_id,
            notes=payload.notes,
        )
    )
    if commit:
        db.commit()
    else:
        db.flush()
    return get_transaction(db, tenant_id, transaction.id)


def void_transaction(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID | None,
    transaction_id: uuid.UUID,
    reason: str,
) -> FinancialTransaction:
    original = get_transaction(db, tenant_id, transaction_id)
    if original.is_voided:
        raise DomainError("Esta transação já foi estornada.")
    if original.reversal_of_id is not None:
        raise DomainError("Não é possível estornar um estorno.")

    repo = FinancialTransactionRepository(db, tenant_id)
    reversal = repo.add(
        FinancialTransaction(
            type=_OPPOSITE_TYPE[original.type],
            category=original.category,
            description=f"Estorno: {original.description}",
            amount=original.amount,
            transaction_date=date.today(),
            payment_method_id=original.payment_method_id,
            responsible_user_id=user_id,
            appointment_id=original.appointment_id,
            reversal_of_id=original.id,
            notes=reason,
        )
    )
    original.is_voided = True

    if user_id is not None:
        audit_service.log_user_action(
            db,
            tenant_id=tenant_id,
            user_id=user_id,
            action="financial_transaction.void",
            resource_type="financial_transaction",
            resource_id=original.id,
            metadata={"amount": str(original.amount), "reason": reason},
        )

    db.commit()
    return get_transaction(db, tenant_id, reversal.id)
