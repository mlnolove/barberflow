import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment
from app.models.customer import Customer


class ClientAppointmentRepository:
    """Agendamentos de UM cliente, possivelmente espalhados por várias
    barbearias — por isso não estende `TenantScopedRepository`. Em vez
    disso, exige `client_account_id` no construtor e sempre faz `join` com
    `Customer` filtrando por ele: o mesmo princípio estrutural (impossível
    montar uma query sem o filtro de isolamento), só que a chave é a
    identidade do cliente em vez do tenant."""

    def __init__(self, db: Session, client_account_id: uuid.UUID):
        self.db = db
        self.client_account_id = client_account_id

    def _scoped(self):
        return (
            select(Appointment)
            .join(Customer, Customer.id == Appointment.customer_id)
            .where(Customer.client_account_id == self.client_account_id)
        )

    def _with_details(self, stmt):
        return stmt.options(
            joinedload(Appointment.customer),
            joinedload(Appointment.employee),
            joinedload(Appointment.service),
        )

    def get_by_id(self, appointment_id: uuid.UUID) -> Appointment | None:
        stmt = self._with_details(self._scoped()).where(Appointment.id == appointment_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_mine(self, *, after: datetime | None, before: datetime | None) -> list[Appointment]:
        stmt = self._scoped()
        if after is not None:
            stmt = stmt.where(Appointment.starts_at >= after)
        if before is not None:
            stmt = stmt.where(Appointment.starts_at < before)
        stmt = self._with_details(stmt).order_by(Appointment.starts_at)
        return list(self.db.execute(stmt).unique().scalars().all())
