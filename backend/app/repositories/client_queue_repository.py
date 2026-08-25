import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.customer import Customer
from app.models.queue_entry import OPEN_QUEUE_STATUSES, QueueEntry


class ClientQueueRepository:
    """Entradas de fila de UM cliente, possivelmente em várias barbearias —
    mesmo princípio de `ClientAppointmentRepository`: exige
    `client_account_id` no construtor e sempre junta com `Customer`."""

    def __init__(self, db: Session, client_account_id: uuid.UUID):
        self.db = db
        self.client_account_id = client_account_id

    def _scoped(self):
        return (
            select(QueueEntry)
            .join(Customer, Customer.id == QueueEntry.customer_id)
            .where(Customer.client_account_id == self.client_account_id)
        )

    def _with_details(self, stmt):
        return stmt.options(
            joinedload(QueueEntry.customer),
            joinedload(QueueEntry.employee),
            joinedload(QueueEntry.service),
        )

    def get_by_id(self, entry_id: uuid.UUID) -> QueueEntry | None:
        stmt = self._with_details(self._scoped()).where(QueueEntry.id == entry_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_open(self) -> list[QueueEntry]:
        stmt = self._scoped().where(QueueEntry.status.in_(OPEN_QUEUE_STATUSES))
        stmt = self._with_details(stmt).order_by(QueueEntry.joined_at)
        return list(self.db.execute(stmt).unique().scalars().all())
