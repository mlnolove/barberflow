import uuid
from datetime import date, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.appointment import Appointment, AppointmentStatus
from app.models.customer import Customer
from app.models.employee import Employee
from app.models.financial_transaction import FinancialTransaction, FinancialTransactionType
from app.models.payment_method import PaymentMethod
from app.models.product import Product
from app.models.service import Service


class DashboardRepository:
    """Consultas de agregação cruzando várias entidades — não é dono de um
    único modelo, por isso não estende `TenantScopedRepository`; todo método
    aqui recebe/filtra por `tenant_id` explicitamente."""

    def __init__(self, db: Session, tenant_id: uuid.UUID):
        self.db = db
        self.tenant_id = tenant_id

    def count_active_customers(self) -> int:
        stmt = select(func.count()).where(
            Customer.tenant_id == self.tenant_id, Customer.is_active.is_(True)
        )
        return self.db.scalar(stmt) or 0

    def count_appointments_on_day(self, day: date) -> int:
        stmt = select(func.count()).where(
            Appointment.tenant_id == self.tenant_id,
            func.date(Appointment.starts_at) == day,
            Appointment.status != AppointmentStatus.CANCELLED,
        )
        return self.db.scalar(stmt) or 0

    def count_completed_in_range(self, start: datetime, end: datetime) -> int:
        stmt = select(func.count()).where(
            Appointment.tenant_id == self.tenant_id,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.starts_at >= start,
            Appointment.starts_at < end,
        )
        return self.db.scalar(stmt) or 0

    def count_pending_appointments(self, *, after: datetime) -> int:
        stmt = select(func.count()).where(
            Appointment.tenant_id == self.tenant_id,
            Appointment.status == AppointmentStatus.PENDING,
            Appointment.starts_at >= after,
        )
        return self.db.scalar(stmt) or 0

    def count_starting_between(self, start: datetime, end: datetime) -> int:
        stmt = select(func.count()).where(
            Appointment.tenant_id == self.tenant_id,
            Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
            Appointment.starts_at >= start,
            Appointment.starts_at < end,
        )
        return self.db.scalar(stmt) or 0

    def count_low_stock_products(self) -> int:
        stmt = select(func.count()).where(
            Product.tenant_id == self.tenant_id,
            Product.is_active.is_(True),
            Product.current_quantity <= Product.min_stock,
        )
        return self.db.scalar(stmt) or 0

    def count_inactive_services(self) -> int:
        stmt = select(func.count()).where(
            Service.tenant_id == self.tenant_id, Service.is_active.is_(False)
        )
        return self.db.scalar(stmt) or 0

    def upcoming_appointments(self, *, after: datetime, limit: int = 5) -> list[Appointment]:
        stmt = (
            select(Appointment)
            .options(
                joinedload(Appointment.customer),
                joinedload(Appointment.employee),
                joinedload(Appointment.service),
            )
            .where(
                Appointment.tenant_id == self.tenant_id,
                Appointment.status.in_([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED]),
                Appointment.starts_at >= after,
            )
            .order_by(Appointment.starts_at)
            .limit(limit)
        )
        return list(self.db.execute(stmt).unique().scalars().all())

    def revenue_by_day(self, start: date, end: date) -> list[tuple[date, float]]:
        stmt = (
            select(FinancialTransaction.transaction_date, func.sum(FinancialTransaction.amount))
            .where(
                FinancialTransaction.tenant_id == self.tenant_id,
                FinancialTransaction.type == FinancialTransactionType.INCOME,
                FinancialTransaction.transaction_date >= start,
                FinancialTransaction.transaction_date <= end,
            )
            .group_by(FinancialTransaction.transaction_date)
        )
        return list(self.db.execute(stmt).all())

    def revenue_by_month(self, start: date, end: date) -> list[tuple[int, int, float]]:
        year = func.extract("year", FinancialTransaction.transaction_date)
        month = func.extract("month", FinancialTransaction.transaction_date)
        stmt = (
            select(year, month, func.sum(FinancialTransaction.amount))
            .where(
                FinancialTransaction.tenant_id == self.tenant_id,
                FinancialTransaction.type == FinancialTransactionType.INCOME,
                FinancialTransaction.transaction_date >= start,
                FinancialTransaction.transaction_date <= end,
            )
            .group_by(year, month)
            .order_by(year, month)
        )
        return [(int(y), int(m), total) for y, m, total in self.db.execute(stmt).all()]

    def top_services(self, start: datetime, limit: int = 5) -> list[tuple[str, int]]:
        """Serviços mais realizados desde `start`. Sem limite superior: um
        atendimento COMPLETED sempre já aconteceu, então basta o piso —
        limitar pelo "agora" excluiria agendamentos concluídos cujo
        `starts_at` (a data marcada, não a de conclusão) ainda não chegou
        no relógio do servidor de teste."""
        stmt = (
            select(Service.name, func.count(Appointment.id))
            .join(Service, Service.id == Appointment.service_id)
            .where(
                Appointment.tenant_id == self.tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED,
                Appointment.starts_at >= start,
            )
            .group_by(Service.name)
            .order_by(func.count(Appointment.id).desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).all())

    def top_professionals(self, start: datetime, limit: int = 5) -> list[tuple[str, int]]:
        stmt = (
            select(Employee.full_name, func.count(Appointment.id))
            .join(Employee, Employee.id == Appointment.employee_id)
            .where(
                Appointment.tenant_id == self.tenant_id,
                Appointment.status == AppointmentStatus.COMPLETED,
                Appointment.starts_at >= start,
            )
            .group_by(Employee.full_name)
            .order_by(func.count(Appointment.id).desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).all())

    def payment_method_breakdown(self, start: date, end: date) -> list[tuple[str, float]]:
        stmt = (
            select(PaymentMethod.name, func.sum(FinancialTransaction.amount))
            .join(PaymentMethod, PaymentMethod.id == FinancialTransaction.payment_method_id)
            .where(
                FinancialTransaction.tenant_id == self.tenant_id,
                FinancialTransaction.type == FinancialTransactionType.INCOME,
                FinancialTransaction.transaction_date >= start,
                FinancialTransaction.transaction_date <= end,
            )
            .group_by(PaymentMethod.name)
            .order_by(func.sum(FinancialTransaction.amount).desc())
        )
        return list(self.db.execute(stmt).all())

    def customer_growth(self, start: datetime, end: datetime) -> list[tuple[int, int, int]]:
        year = func.extract("year", Customer.created_at)
        month = func.extract("month", Customer.created_at)
        stmt = (
            select(year, month, func.count(Customer.id))
            .where(
                Customer.tenant_id == self.tenant_id,
                Customer.created_at >= start,
                Customer.created_at < end,
            )
            .group_by(year, month)
            .order_by(year, month)
        )
        return [(int(y), int(m), count) for y, m, count in self.db.execute(stmt).all()]

    def average_ticket(self, start: datetime, end: datetime) -> float:
        stmt = select(func.avg(Appointment.price)).where(
            Appointment.tenant_id == self.tenant_id,
            Appointment.status == AppointmentStatus.COMPLETED,
            Appointment.starts_at >= start,
            Appointment.starts_at < end,
        )
        return self.db.scalar(stmt) or 0
