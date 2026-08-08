import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.appointment import OPEN_STATUSES, Appointment
from app.repositories.base import TenantScopedRepository


class AppointmentRepository(TenantScopedRepository[Appointment]):
    model = Appointment

    def _with_details(self, stmt):
        return stmt.options(
            joinedload(Appointment.customer),
            joinedload(Appointment.employee),
            joinedload(Appointment.service),
        )

    def get_by_id(self, entity_id: uuid.UUID) -> Appointment | None:
        stmt = self._with_details(self._scoped()).where(Appointment.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_in_range(
        self,
        *,
        range_start: datetime,
        range_end: datetime,
        employee_id: uuid.UUID | None = None,
        status: str | None = None,
    ) -> list[Appointment]:
        stmt = self._scoped().where(
            Appointment.starts_at < range_end, Appointment.ends_at > range_start
        )
        if employee_id:
            stmt = stmt.where(Appointment.employee_id == employee_id)
        if status:
            stmt = stmt.where(Appointment.status == status)

        stmt = self._with_details(stmt).order_by(Appointment.starts_at)
        return list(self.db.execute(stmt).unique().scalars().all())

    def has_conflict(
        self,
        *,
        employee_id: uuid.UUID,
        range_start: datetime,
        range_end: datetime,
        exclude_appointment_id: uuid.UUID | None = None,
    ) -> bool:
        stmt = select(Appointment.id).where(
            Appointment.tenant_id == self.tenant_id,
            Appointment.employee_id == employee_id,
            Appointment.status.in_(OPEN_STATUSES),
            Appointment.starts_at < range_end,
            Appointment.ends_at > range_start,
        )
        if exclude_appointment_id:
            stmt = stmt.where(Appointment.id != exclude_appointment_id)
        return self.db.execute(stmt).first() is not None
