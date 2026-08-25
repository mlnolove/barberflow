import uuid
from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import DomainError, NotFoundError
from app.models.financial_transaction import FinancialTransactionType
from app.models.notification import NotificationType
from app.models.queue_entry import QueueEntry, QueueStatus
from app.models.tenant import SchedulingMode
from app.repositories.blocked_date_repository import BlockedDateRepository
from app.repositories.business_hours_repository import BusinessHoursRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.repositories.queue_entry_repository import QueueEntryRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.tenant_repository import TenantRepository
from app.schemas.financial_transaction import FinancialTransactionCreate
from app.schemas.queue import QueueCompleteRequest
from app.services import appointment_service, financial_service, notification_service

_ALLOWED_TRANSITIONS: dict[QueueStatus, set[QueueStatus]] = {
    QueueStatus.WAITING: {
        QueueStatus.CALLED,
        QueueStatus.IN_SERVICE,
        QueueStatus.CANCELLED,
        QueueStatus.NO_SHOW,
    },
    QueueStatus.CALLED: {QueueStatus.IN_SERVICE, QueueStatus.CANCELLED, QueueStatus.NO_SHOW},
    QueueStatus.IN_SERVICE: {QueueStatus.COMPLETED, QueueStatus.CANCELLED},
    QueueStatus.COMPLETED: set(),
    QueueStatus.CANCELLED: set(),
    QueueStatus.NO_SHOW: set(),
}


def require_queue_mode(tenant) -> None:
    if tenant.scheduling_mode != SchedulingMode.QUEUE:
        raise DomainError("Esta barbearia não usa o modo de fila/ordem de chegada.")


def _today_is_open(db: Session, tenant_id: uuid.UUID) -> bool:
    today = date.today()
    business_hours = BusinessHoursRepository(db, tenant_id).get_by_weekday(today.weekday())
    if business_hours is None or not business_hours.is_open:
        return False
    return not BlockedDateRepository(db, tenant_id).is_blocked(today)


def list_queue(db: Session, tenant_id: uuid.UUID) -> list[tuple[QueueEntry, int | None]]:
    repo = QueueEntryRepository(db, tenant_id)
    entries = repo.list_open()
    return [
        (entry, repo.position_of(entry) if entry.status == QueueStatus.WAITING else None)
        for entry in entries
    ]


def get_queue_entry(
    db: Session, tenant_id: uuid.UUID, entry_id: uuid.UUID
) -> tuple[QueueEntry, int | None]:
    repo = QueueEntryRepository(db, tenant_id)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundError("Entrada na fila não encontrada.")
    position = repo.position_of(entry) if entry.status == QueueStatus.WAITING else None
    return entry, position


def join_queue(
    db: Session,
    tenant_id: uuid.UUID,
    customer_id: uuid.UUID,
    service_id: uuid.UUID,
    employee_id: uuid.UUID | None,
) -> QueueEntry:
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is None or not tenant.is_active:
        raise NotFoundError("Barbearia não encontrada.")
    require_queue_mode(tenant)

    if CustomerRepository(db, tenant_id).get_by_id(customer_id) is None:
        raise NotFoundError("Cliente não encontrado.")

    service = ServiceRepository(db, tenant_id).get_by_id(service_id)
    if service is None:
        raise NotFoundError("Serviço não encontrado.")
    if not service.is_active:
        raise DomainError("Este serviço está desativado.")

    if employee_id is not None:
        employee = EmployeeRepository(db, tenant_id).get_by_id(employee_id)
        if employee is None:
            raise NotFoundError("Profissional não encontrado.")
        if not employee.is_active:
            raise DomainError("Este profissional está inativo.")
        if not appointment_service.employee_offers_service(employee, service.id):
            raise DomainError("Este profissional não realiza o serviço selecionado.")

    if not _today_is_open(db, tenant_id):
        raise DomainError("A barbearia está fechada hoje.")

    repo = QueueEntryRepository(db, tenant_id)
    entry = repo.add(
        QueueEntry(customer_id=customer_id, employee_id=employee_id, service_id=service_id)
    )
    db.commit()
    return repo.get_by_id(entry.id)


def _apply_transition(
    db: Session,
    tenant_id: uuid.UUID,
    entry_id: uuid.UUID,
    to_status: QueueStatus,
    **timestamp_fields,
) -> QueueEntry:
    repo = QueueEntryRepository(db, tenant_id)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundError("Entrada na fila não encontrada.")
    allowed = _ALLOWED_TRANSITIONS.get(entry.status, set())
    if to_status not in allowed:
        raise DomainError(
            f"Não é possível mudar o status de {entry.status.value} para {to_status.value}."
        )
    entry.status = to_status
    for field, value in timestamp_fields.items():
        setattr(entry, field, value)
    db.flush()
    return entry


def call_next(db: Session, tenant_id: uuid.UUID, employee_id: uuid.UUID | None) -> QueueEntry:
    entry = QueueEntryRepository(db, tenant_id).next_waiting(employee_id)
    if entry is None:
        raise NotFoundError("Não há ninguém esperando nessa fila.")
    entry = _apply_transition(
        db, tenant_id, entry.id, QueueStatus.CALLED, called_at=datetime.now(UTC)
    )

    client_account_id = entry.customer.client_account_id
    if client_account_id is not None:
        notification_service.notify_client(
            db,
            tenant_id=tenant_id,
            client_account_id=client_account_id,
            type_=NotificationType.APPOINTMENT_REMINDER,
            title="Chegou sua vez!",
            body=f"Dirija-se à barbearia — é sua vez para {entry.service.name}.",
            metadata={"queue_entry_id": str(entry.id)},
        )

    db.commit()
    return QueueEntryRepository(db, tenant_id).get_by_id(entry.id)


def start_service(db: Session, tenant_id: uuid.UUID, entry_id: uuid.UUID) -> QueueEntry:
    entry = _apply_transition(
        db, tenant_id, entry_id, QueueStatus.IN_SERVICE, started_at=datetime.now(UTC)
    )
    db.commit()
    return QueueEntryRepository(db, tenant_id).get_by_id(entry.id)


def complete_queue_entry(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    entry_id: uuid.UUID,
    payload: QueueCompleteRequest,
) -> QueueEntry:
    """Fecha o atendimento da fila gerando a entrada financeira, no mesmo
    espírito de `appointment_service.complete_appointment` (seção 20) —
    sem venda de produtos aqui, para manter o modo fila simples."""
    repo = QueueEntryRepository(db, tenant_id)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundError("Entrada na fila não encontrada.")

    payment_method = PaymentMethodRepository(db, tenant_id).get_by_code(payload.payment_method_code)
    if payment_method is None:
        raise NotFoundError("Forma de pagamento não encontrada.")
    if not payment_method.is_active:
        raise DomainError("Esta forma de pagamento está desativada.")

    price = payload.price if payload.price is not None else entry.service.price

    _apply_transition(db, tenant_id, entry_id, QueueStatus.COMPLETED, finished_at=datetime.now(UTC))

    financial_service.create_transaction(
        db,
        tenant_id,
        user_id,
        FinancialTransactionCreate(
            type=FinancialTransactionType.INCOME,
            category="Serviço",
            description=f"{entry.service.name} — {entry.customer.full_name} (fila)",
            amount=price,
            transaction_date=date.today(),
            payment_method_id=payment_method.id,
        ),
        commit=False,
    )

    db.commit()
    return repo.get_by_id(entry_id)


def cancel_queue_entry(
    db: Session, tenant_id: uuid.UUID, entry_id: uuid.UUID, reason: str
) -> QueueEntry:
    entry = _apply_transition(db, tenant_id, entry_id, QueueStatus.CANCELLED)
    entry.cancellation_reason = reason
    db.commit()
    return QueueEntryRepository(db, tenant_id).get_by_id(entry_id)


def mark_no_show(db: Session, tenant_id: uuid.UUID, entry_id: uuid.UUID) -> QueueEntry:
    _apply_transition(db, tenant_id, entry_id, QueueStatus.NO_SHOW)
    db.commit()
    return QueueEntryRepository(db, tenant_id).get_by_id(entry_id)
