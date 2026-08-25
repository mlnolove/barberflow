import uuid
from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.exceptions import DomainError, NotFoundError
from app.models.appointment import Appointment, AppointmentStatus, AppointmentStatusHistory
from app.models.client_account import ClientAccount
from app.models.customer import Customer
from app.models.notification import NotificationType
from app.models.tenant import SchedulingMode
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.client_appointment_repository import ClientAppointmentRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.tenant_repository import TenantRepository
from app.repositories.user_repository import find_tenant_owner
from app.schemas.client_appointment import (
    BarbershopSummary,
    ClientAppointmentCreate,
    ClientAppointmentRead,
)
from app.schemas.employee import EmployeeSummary
from app.schemas.service import ServiceSummary
from app.services import appointment_service, notification_service

_CLIENT_CANCELLABLE_STATUSES = {AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED}


def to_read_model(db: Session, appointment: Appointment) -> ClientAppointmentRead:
    """`Appointment` não carrega relacionamento com `Tenant` (é tenant-scoped
    via coluna, não via relationship) — buscamos à parte para montar a
    resposta com o nome/logo da barbearia."""
    tenant = TenantRepository(db).get_by_id(appointment.tenant_id)
    return ClientAppointmentRead(
        id=appointment.id,
        barbershop=BarbershopSummary(id=tenant.id, name=tenant.name, logo_url=tenant.logo_url),
        employee=EmployeeSummary.model_validate(appointment.employee),
        service=ServiceSummary.model_validate(appointment.service),
        starts_at=appointment.starts_at,
        ends_at=appointment.ends_at,
        duration_minutes=appointment.duration_minutes,
        price=appointment.price,
        status=appointment.status,
        notes=appointment.notes,
        cancellation_reason=appointment.cancellation_reason,
        created_at=appointment.created_at,
    )


def get_or_create_customer_for_client(
    db: Session, tenant_id: uuid.UUID, client_account: ClientAccount
) -> Customer:
    """Compartilhado entre agendamento (Modo 1) e fila (Modo 2) — ambos
    precisam do `Customer` tenant-scoped vinculado ao `ClientAccount` antes
    de criar `Appointment`/`QueueEntry`, que continuam referenciando
    `Customer` exatamente como no fluxo da equipe."""
    stmt = select(Customer).where(
        Customer.tenant_id == tenant_id, Customer.client_account_id == client_account.id
    )
    existing = db.execute(stmt).scalar_one_or_none()
    if existing is not None:
        return existing

    customer = Customer(
        tenant_id=tenant_id,
        full_name=client_account.full_name,
        phone=client_account.phone,
        email=client_account.email,
        client_account_id=client_account.id,
    )
    db.add(customer)
    db.flush()
    return customer


def book_appointment(
    db: Session, client_account: ClientAccount, payload: ClientAppointmentCreate
) -> Appointment:
    tenant = TenantRepository(db).get_by_id(payload.tenant_id)
    if tenant is None or not tenant.is_active:
        raise NotFoundError("Barbearia não encontrada.")
    if tenant.scheduling_mode != SchedulingMode.TIME_SLOT:
        raise DomainError(
            "Esta barbearia usa o modo de fila/ordem de chegada — use o endpoint de fila."
        )

    employee = EmployeeRepository(db, tenant.id).get_by_id(payload.employee_id)
    if employee is None:
        raise NotFoundError("Profissional não encontrado.")

    service = ServiceRepository(db, tenant.id).get_by_id(payload.service_id)
    if service is None:
        raise NotFoundError("Serviço não encontrado.")
    if not service.is_active:
        raise DomainError("Este serviço está desativado e não aceita novos agendamentos.")

    # Preço e duração vêm sempre do banco (seção 19 da especificação) — o
    # payload do cliente não carrega nem um nem outro.
    ends_at = appointment_service.validate_schedule(
        db,
        tenant.id,
        employee=employee,
        service_id=service.id,
        starts_at=payload.starts_at,
        duration_minutes=service.duration_minutes,
    )

    customer = get_or_create_customer_for_client(db, tenant.id, client_account)

    status = (
        AppointmentStatus.CONFIRMED
        if tenant.auto_approve_appointments
        else AppointmentStatus.PENDING
    )

    repo = AppointmentRepository(db, tenant.id)
    appointment = repo.add(
        Appointment(
            customer_id=customer.id,
            employee_id=employee.id,
            service_id=service.id,
            starts_at=payload.starts_at,
            ends_at=ends_at,
            duration_minutes=service.duration_minutes,
            price=service.price,
            status=status,
            notes=payload.notes,
        )
    )

    owner = find_tenant_owner(db, tenant.id)
    if owner is not None:
        pending_note = " Aguardando aprovação." if status == AppointmentStatus.PENDING else ""
        notification_service.notify_user(
            db,
            tenant_id=tenant.id,
            user_id=owner.id,
            type_=NotificationType.NEW_APPOINTMENT,
            title="Novo agendamento",
            body=f"{client_account.full_name} agendou {service.name}.{pending_note}",
            metadata={"appointment_id": str(appointment.id)},
        )

    db.commit()
    return repo.get_by_id(appointment.id)


def list_my_appointments(
    db: Session, client_account_id: uuid.UUID, scope: Literal["upcoming", "history", "all"]
) -> list[Appointment]:
    now = datetime.now(UTC)
    repo = ClientAppointmentRepository(db, client_account_id)
    if scope == "upcoming":
        return repo.list_mine(after=now, before=None)
    if scope == "history":
        return repo.list_mine(after=None, before=now)
    return repo.list_mine(after=None, before=None)


def get_my_appointment(
    db: Session, client_account_id: uuid.UUID, appointment_id: uuid.UUID
) -> Appointment:
    appointment = ClientAppointmentRepository(db, client_account_id).get_by_id(appointment_id)
    if appointment is None:
        raise NotFoundError("Agendamento não encontrado.")
    return appointment


def cancel_my_appointment(
    db: Session, client_account_id: uuid.UUID, appointment_id: uuid.UUID, reason: str
) -> Appointment:
    client_repo = ClientAppointmentRepository(db, client_account_id)
    appointment = client_repo.get_by_id(appointment_id)
    if appointment is None:
        raise NotFoundError("Agendamento não encontrado.")

    if appointment.status not in _CLIENT_CANCELLABLE_STATUSES:
        raise DomainError("Este agendamento não pode mais ser cancelado.")

    tenant = TenantRepository(db).get_by_id(appointment.tenant_id)
    if tenant is None:
        raise NotFoundError("Barbearia não encontrada.")
    if not tenant.allow_cancellation:
        raise DomainError("Cancelamento de agendamentos está desativado nesta barbearia.")

    if tenant.cancellation_deadline_minutes is not None:
        deadline = appointment.starts_at - timedelta(minutes=tenant.cancellation_deadline_minutes)
        if datetime.now(UTC) > deadline:
            raise DomainError(
                "Prazo para cancelamento pelo cliente expirou. Entre em contato com a barbearia."
            )

    appointment.cancellation_reason = reason
    db.add(
        AppointmentStatusHistory(
            appointment_id=appointment.id,
            changed_by_client_id=client_account_id,
            from_status=appointment.status,
            to_status=AppointmentStatus.CANCELLED,
            reason=reason,
        )
    )
    appointment.status = AppointmentStatus.CANCELLED

    owner = find_tenant_owner(db, tenant.id)
    if owner is not None:
        notification_service.notify_user(
            db,
            tenant_id=tenant.id,
            user_id=owner.id,
            type_=NotificationType.APPOINTMENT_CANCELLED,
            title="Cliente cancelou agendamento",
            body=(
                f"{appointment.customer.full_name} cancelou o horário de "
                f"{appointment.service.name}."
            ),
            metadata={"appointment_id": str(appointment.id)},
        )

    db.commit()
    return client_repo.get_by_id(appointment.id)
