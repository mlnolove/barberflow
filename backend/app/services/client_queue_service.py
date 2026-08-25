import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.client_account import ClientAccount
from app.models.notification import NotificationType
from app.models.queue_entry import QueueEntry
from app.repositories.client_queue_repository import ClientQueueRepository
from app.repositories.queue_entry_repository import QueueEntryRepository
from app.repositories.user_repository import find_tenant_owner
from app.services import notification_service, queue_service
from app.services.client_appointment_service import get_or_create_customer_for_client


def join_queue(
    db: Session,
    tenant_id: uuid.UUID,
    client_account: ClientAccount,
    service_id: uuid.UUID,
    employee_id: uuid.UUID | None,
) -> QueueEntry:
    customer = get_or_create_customer_for_client(db, tenant_id, client_account)
    entry = queue_service.join_queue(db, tenant_id, customer.id, service_id, employee_id)

    owner = find_tenant_owner(db, tenant_id)
    if owner is not None:
        notification_service.notify_user(
            db,
            tenant_id=tenant_id,
            user_id=owner.id,
            type_=NotificationType.NEW_APPOINTMENT,
            title="Novo cliente na fila",
            body=f"{client_account.full_name} entrou na fila.",
            metadata={"queue_entry_id": str(entry.id)},
        )
        db.commit()

    return QueueEntryRepository(db, tenant_id).get_by_id(entry.id)


def get_my_position(
    db: Session, client_account_id: uuid.UUID, entry_id: uuid.UUID
) -> tuple[QueueEntry, int | None]:
    repo = ClientQueueRepository(db, client_account_id)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundError("Entrada na fila não encontrada.")
    if entry.status.value != "WAITING":
        return entry, None
    position = QueueEntryRepository(db, entry.tenant_id).position_of(entry)
    return entry, position


def list_my_queue_entries(
    db: Session, client_account_id: uuid.UUID
) -> list[tuple[QueueEntry, int | None]]:
    repo = ClientQueueRepository(db, client_account_id)
    entries = repo.list_open()
    result = []
    for entry in entries:
        position = (
            QueueEntryRepository(db, entry.tenant_id).position_of(entry)
            if entry.status.value == "WAITING"
            else None
        )
        result.append((entry, position))
    return result


def cancel_my_queue_entry(
    db: Session, client_account_id: uuid.UUID, entry_id: uuid.UUID, reason: str
) -> QueueEntry:
    repo = ClientQueueRepository(db, client_account_id)
    entry = repo.get_by_id(entry_id)
    if entry is None:
        raise NotFoundError("Entrada na fila não encontrada.")
    return queue_service.cancel_queue_entry(db, entry.tenant_id, entry_id, reason)
