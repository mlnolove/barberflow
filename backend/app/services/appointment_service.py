import uuid
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.appointment import Appointment, AppointmentStatus, AppointmentStatusHistory
from app.models.employee import Employee
from app.models.financial_transaction import FinancialTransactionType
from app.models.notification import NotificationType
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.blocked_date_repository import BlockedDateRepository
from app.repositories.business_hours_repository import BusinessHoursRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.payment_method_repository import PaymentMethodRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.tenant_repository import TenantRepository
from app.schemas.appointment import AppointmentComplete, AppointmentCreate, AppointmentReschedule
from app.schemas.financial_transaction import FinancialTransactionCreate
from app.schemas.inventory_movement import ManualMovementType, StockMovementCreate
from app.services import financial_service, inventory_service, notification_service


def _notify_client_if_linked(
    db,
    tenant_id: uuid.UUID,
    appointment: Appointment,
    type_: NotificationType,
    title: str,
    body: str,
) -> None:
    """Só existe destinatário quando o `Customer` do agendamento está
    vinculado a um `ClientAccount` (ver seção 1 da Fase 1 do marketplace) —
    um walk-in cadastrado manualmente pela equipe não tem app instalado."""
    client_account_id = appointment.customer.client_account_id
    if client_account_id is None:
        return
    notification_service.notify_client(
        db,
        tenant_id=tenant_id,
        client_account_id=client_account_id,
        type_=type_,
        title=title,
        body=body,
        metadata={"appointment_id": str(appointment.id)},
    )


_ALLOWED_TRANSITIONS: dict[AppointmentStatus, set[AppointmentStatus]] = {
    AppointmentStatus.PENDING: {
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.CONFIRMED: {
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.IN_PROGRESS: {AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED},
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.CANCELLED: set(),
    AppointmentStatus.NO_SHOW: set(),
}

_RESCHEDULABLE_STATUSES = {AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED}


def _employee_offers_service(employee: Employee, service_id: uuid.UUID) -> bool:
    return any(link.service_id == service_id for link in employee.services)


def _validate_schedule(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    employee: Employee,
    service_id: uuid.UUID,
    starts_at: datetime,
    duration_minutes: int,
    exclude_appointment_id: uuid.UUID | None = None,
) -> datetime:
    if not employee.is_active:
        raise DomainError("Este profissional está inativo.")
    if not _employee_offers_service(employee, service_id):
        raise DomainError("Este profissional não realiza o serviço selecionado.")

    weekday = starts_at.weekday()
    business_hours = BusinessHoursRepository(db, tenant_id).get_by_weekday(weekday)
    if business_hours is None or not business_hours.is_open:
        raise DomainError("A barbearia não funciona neste dia da semana.")

    if BlockedDateRepository(db, tenant_id).is_blocked(starts_at.date()):
        raise DomainError("Esta data está bloqueada para agendamentos.")

    ends_at = starts_at + timedelta(minutes=duration_minutes)
    if starts_at.time() < business_hours.open_time or ends_at.time() > business_hours.close_time:
        raise DomainError("Horário fora do funcionamento da barbearia.")

    if (
        business_hours.break_start_time
        and business_hours.break_end_time
        and starts_at.time() < business_hours.break_end_time
        and ends_at.time() > business_hours.break_start_time
    ):
        raise DomainError("Horário cai dentro do intervalo de funcionamento da barbearia.")

    if employee.work_days and weekday not in employee.work_days:
        raise DomainError("Este profissional não trabalha neste dia da semana.")
    if employee.work_start_time and starts_at.time() < employee.work_start_time:
        raise DomainError("Horário fora da jornada de trabalho do profissional.")
    if employee.work_end_time and ends_at.time() > employee.work_end_time:
        raise DomainError("Horário fora da jornada de trabalho do profissional.")

    tenant = TenantRepository(db).get_by_id(tenant_id)
    buffer = timedelta(minutes=tenant.appointment_buffer_minutes if tenant else 0)

    if tenant is not None:
        now = datetime.now(UTC)
        if starts_at < now + timedelta(minutes=tenant.min_advance_minutes):
            raise DomainError(
                f"Agendamentos precisam ser feitos com pelo menos "
                f"{tenant.min_advance_minutes} minutos de antecedência."
            )
        if starts_at > now + timedelta(days=tenant.max_advance_days):
            raise DomainError(
                f"Agendamentos podem ser feitos com no máximo "
                f"{tenant.max_advance_days} dias de antecedência."
            )

    conflict_repo = AppointmentRepository(db, tenant_id)
    if conflict_repo.has_conflict(
        employee_id=employee.id,
        range_start=starts_at - buffer,
        range_end=ends_at + buffer,
        exclude_appointment_id=exclude_appointment_id,
    ):
        raise ConflictError("Já existe um agendamento para este profissional nesse horário.")

    return ends_at


def validate_schedule(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    employee: Employee,
    service_id: uuid.UUID,
    starts_at: datetime,
    duration_minutes: int,
    exclude_appointment_id: uuid.UUID | None = None,
) -> datetime:
    """Wrapper público de `_validate_schedule` — ponto único de reuso das
    regras de conflito de horário (funcionamento, jornada do profissional,
    bloqueios, antecedência, conflito de agenda) por outros domínios, como
    `availability_service` e `client_appointment_service`, sem duplicá-las."""
    return _validate_schedule(
        db,
        tenant_id,
        employee=employee,
        service_id=service_id,
        starts_at=starts_at,
        duration_minutes=duration_minutes,
        exclude_appointment_id=exclude_appointment_id,
    )


def employee_offers_service(employee: Employee, service_id: uuid.UUID) -> bool:
    return _employee_offers_service(employee, service_id)


def list_appointments(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    range_start: datetime,
    range_end: datetime,
    employee_id: uuid.UUID | None = None,
    status: str | None = None,
) -> list[Appointment]:
    repo = AppointmentRepository(db, tenant_id)
    return repo.list_in_range(
        range_start=range_start, range_end=range_end, employee_id=employee_id, status=status
    )


def get_appointment(db: Session, tenant_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment:
    repo = AppointmentRepository(db, tenant_id)
    appointment = repo.get_by_id(appointment_id)
    if appointment is None:
        raise NotFoundError("Agendamento não encontrado.")
    return appointment


def create_appointment(
    db: Session, tenant_id: uuid.UUID, payload: AppointmentCreate
) -> Appointment:
    if CustomerRepository(db, tenant_id).get_by_id(payload.customer_id) is None:
        raise NotFoundError("Cliente não encontrado.")

    employee = EmployeeRepository(db, tenant_id).get_by_id(payload.employee_id)
    if employee is None:
        raise NotFoundError("Profissional não encontrado.")

    service = ServiceRepository(db, tenant_id).get_by_id(payload.service_id)
    if service is None:
        raise NotFoundError("Serviço não encontrado.")
    if not service.is_active:
        raise DomainError("Este serviço está desativado e não aceita novos agendamentos.")

    ends_at = _validate_schedule(
        db,
        tenant_id,
        employee=employee,
        service_id=service.id,
        starts_at=payload.starts_at,
        duration_minutes=service.duration_minutes,
    )

    repo = AppointmentRepository(db, tenant_id)
    appointment = repo.add(
        Appointment(
            customer_id=payload.customer_id,
            employee_id=employee.id,
            service_id=service.id,
            starts_at=payload.starts_at,
            ends_at=ends_at,
            duration_minutes=service.duration_minutes,
            price=service.price,
            status=AppointmentStatus.PENDING,
            notes=payload.notes,
        )
    )
    db.commit()
    return get_appointment(db, tenant_id, appointment.id)


def reschedule_appointment(
    db: Session,
    tenant_id: uuid.UUID,
    appointment_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: AppointmentReschedule,
) -> Appointment:
    appointment = get_appointment(db, tenant_id, appointment_id)
    if appointment.status not in _RESCHEDULABLE_STATUSES:
        raise DomainError("Este agendamento não pode mais ser remarcado.")

    employee_id = payload.employee_id or appointment.employee_id
    employee = EmployeeRepository(db, tenant_id).get_by_id(employee_id)
    if employee is None:
        raise NotFoundError("Profissional não encontrado.")

    old_starts_at = appointment.starts_at
    ends_at = _validate_schedule(
        db,
        tenant_id,
        employee=employee,
        service_id=appointment.service_id,
        starts_at=payload.starts_at,
        duration_minutes=appointment.duration_minutes,
        exclude_appointment_id=appointment.id,
    )

    appointment.starts_at = payload.starts_at
    appointment.ends_at = ends_at
    appointment.employee_id = employee.id

    reason = f"Reagendado de {old_starts_at.isoformat()} para {payload.starts_at.isoformat()}."
    db.add(
        AppointmentStatusHistory(
            appointment_id=appointment.id,
            changed_by_user_id=user_id,
            from_status=appointment.status,
            to_status=appointment.status,
            reason=reason,
        )
    )
    db.commit()
    return get_appointment(db, tenant_id, appointment_id)


def _apply_transition(
    db: Session,
    tenant_id: uuid.UUID,
    appointment_id: uuid.UUID,
    user_id: uuid.UUID,
    to_status: AppointmentStatus,
    *,
    reason: str | None = None,
) -> Appointment:
    """Aplica a transição de status e grava o histórico, mas NÃO comita —
    quem chama decide o momento do commit (necessário para agrupar a
    finalização do atendimento com o lançamento financeiro numa única
    transação de banco, seção 20 da especificação)."""
    appointment = get_appointment(db, tenant_id, appointment_id)
    allowed = _ALLOWED_TRANSITIONS.get(appointment.status, set())
    if to_status not in allowed:
        raise DomainError(
            f"Não é possível mudar o status de {appointment.status.value} para {to_status.value}."
        )

    db.add(
        AppointmentStatusHistory(
            appointment_id=appointment.id,
            changed_by_user_id=user_id,
            from_status=appointment.status,
            to_status=to_status,
            reason=reason,
        )
    )
    appointment.status = to_status
    db.flush()
    return appointment


def confirm_appointment(
    db: Session, tenant_id: uuid.UUID, appointment_id: uuid.UUID, user_id: uuid.UUID
) -> Appointment:
    appointment = _apply_transition(
        db, tenant_id, appointment_id, user_id, AppointmentStatus.CONFIRMED
    )
    _notify_client_if_linked(
        db,
        tenant_id,
        appointment,
        NotificationType.APPOINTMENT_CONFIRMED,
        "Agendamento confirmado",
        f"Seu horário de {appointment.service.name} foi confirmado.",
    )
    db.commit()
    return get_appointment(db, tenant_id, appointment_id)


def start_appointment(
    db: Session, tenant_id: uuid.UUID, appointment_id: uuid.UUID, user_id: uuid.UUID
) -> Appointment:
    _apply_transition(db, tenant_id, appointment_id, user_id, AppointmentStatus.IN_PROGRESS)
    db.commit()
    return get_appointment(db, tenant_id, appointment_id)


def complete_appointment(
    db: Session,
    tenant_id: uuid.UUID,
    appointment_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: AppointmentComplete,
) -> Appointment:
    """Fecha o atendimento (seção 20): confirma o valor, valida a forma de
    pagamento, registra a entrada financeira do serviço, dá baixa e registra
    a venda de eventuais produtos usados — tudo numa única transação."""
    appointment = get_appointment(db, tenant_id, appointment_id)

    payment_method = PaymentMethodRepository(db, tenant_id).get_by_code(payload.payment_method_code)
    if payment_method is None:
        raise NotFoundError("Forma de pagamento não encontrada.")
    if not payment_method.is_active:
        raise DomainError("Esta forma de pagamento está desativada.")

    if payload.price is not None:
        appointment.price = payload.price
    appointment.payment_method = payment_method.code
    db.flush()

    _apply_transition(db, tenant_id, appointment_id, user_id, AppointmentStatus.COMPLETED)

    financial_service.create_transaction(
        db,
        tenant_id,
        user_id,
        FinancialTransactionCreate(
            type=FinancialTransactionType.INCOME,
            category="Serviço",
            description=f"{appointment.service.name} — {appointment.customer.full_name}",
            amount=appointment.price,
            transaction_date=date.today(),
            payment_method_id=payment_method.id,
        ),
        appointment_id=appointment.id,
        commit=False,
    )

    products_total = Decimal(0)
    for item in payload.products_sold:
        product = inventory_service.create_stock_movement(
            db,
            tenant_id,
            item.product_id,
            user_id,
            StockMovementCreate(
                type=ManualMovementType.SALE,
                quantity=item.quantity,
                reason=f"Venda durante atendimento de {appointment.customer.full_name}",
            ),
            commit=False,
        )
        products_total += Decimal(str(product.sale_price)) * item.quantity

    if products_total > 0:
        financial_service.create_transaction(
            db,
            tenant_id,
            user_id,
            FinancialTransactionCreate(
                type=FinancialTransactionType.INCOME,
                category="Produto",
                description=f"Produtos vendidos — {appointment.customer.full_name}",
                amount=products_total,
                transaction_date=date.today(),
                payment_method_id=payment_method.id,
            ),
            appointment_id=appointment.id,
            commit=False,
        )

    db.commit()
    return get_appointment(db, tenant_id, appointment_id)


def cancel_appointment(
    db: Session, tenant_id: uuid.UUID, appointment_id: uuid.UUID, user_id: uuid.UUID, reason: str
) -> Appointment:
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is not None and not tenant.allow_cancellation:
        raise DomainError("Cancelamento de agendamentos está desativado nas configurações.")

    appointment = get_appointment(db, tenant_id, appointment_id)
    appointment.cancellation_reason = reason
    db.flush()
    _apply_transition(
        db, tenant_id, appointment_id, user_id, AppointmentStatus.CANCELLED, reason=reason
    )
    _notify_client_if_linked(
        db,
        tenant_id,
        appointment,
        NotificationType.APPOINTMENT_CANCELLED,
        "Agendamento cancelado",
        f"A barbearia cancelou seu horário de {appointment.service.name}. Motivo: {reason}",
    )
    db.commit()
    return get_appointment(db, tenant_id, appointment_id)


def mark_no_show(
    db: Session, tenant_id: uuid.UUID, appointment_id: uuid.UUID, user_id: uuid.UUID
) -> Appointment:
    _apply_transition(db, tenant_id, appointment_id, user_id, AppointmentStatus.NO_SHOW)
    db.commit()
    return get_appointment(db, tenant_id, appointment_id)
