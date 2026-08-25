import uuid

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.queue_entry import OPEN_QUEUE_STATUSES, QueueEntry, QueueStatus
from app.repositories.base import TenantScopedRepository


class QueueEntryRepository(TenantScopedRepository[QueueEntry]):
    model = QueueEntry

    def _with_details(self, stmt):
        return stmt.options(
            joinedload(QueueEntry.customer),
            joinedload(QueueEntry.employee),
            joinedload(QueueEntry.service),
        )

    def get_by_id(self, entity_id: uuid.UUID) -> QueueEntry | None:
        stmt = self._with_details(self._scoped()).where(QueueEntry.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_open(self) -> list[QueueEntry]:
        stmt = (
            self._scoped()
            .where(QueueEntry.status.in_(OPEN_QUEUE_STATUSES))
            .order_by(QueueEntry.joined_at)
        )
        return list(self.db.execute(self._with_details(stmt)).unique().scalars().all())

    def position_of(self, entry: QueueEntry) -> int:
        """Conta quantas entradas `WAITING` do mesmo escopo (mesmo
        `employee_id`, incluindo "sem preferência" = None) chegaram antes —
        sempre recalculado, nunca armazenado (ver docstring do model)."""
        stmt = select(QueueEntry.id).where(
            QueueEntry.tenant_id == self.tenant_id,
            QueueEntry.status == QueueStatus.WAITING,
            QueueEntry.employee_id.is_(entry.employee_id)
            if entry.employee_id is None
            else QueueEntry.employee_id == entry.employee_id,
            QueueEntry.joined_at < entry.joined_at,
        )
        earlier = len(self.db.execute(stmt).all())
        return earlier + 1

    def next_waiting(self, employee_id: uuid.UUID | None) -> QueueEntry | None:
        stmt = self._scoped().where(QueueEntry.status == QueueStatus.WAITING)
        stmt = stmt.where(
            QueueEntry.employee_id.is_(None)
            if employee_id is None
            else QueueEntry.employee_id == employee_id
        )
        stmt = self._with_details(stmt).order_by(QueueEntry.joined_at).limit(1)
        return self.db.execute(stmt).scalar_one_or_none()
