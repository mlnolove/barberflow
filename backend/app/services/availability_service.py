import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.exceptions import DomainError, NotFoundError
from app.models.tenant import SchedulingMode
from app.repositories.blocked_date_repository import BlockedDateRepository
from app.repositories.business_hours_repository import BusinessHoursRepository
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.tenant_repository import TenantRepository
from app.services import appointment_service

# BarberFlow é um produto para o mercado brasileiro (validação de telefone,
# textos, etc. já assumem isso) e o Brasil não observa horário de verão desde
# 2019 — por isso um offset fixo é seguro aqui. `has_conflict`/`_validate_
# schedule` comparam o INSTANTE real (via Postgres timestamptz), então os
# candidatos gerados aqui precisam usar o mesmo fuso que o app do cliente usa
# ao enviar `starts_at` na hora de agendar; caso contrário um horário
# "livre" listado aqui poderia na verdade já estar ocupado (e vice-versa).
BR_TIMEZONE = timezone(timedelta(hours=-3))


def list_available_slots(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    employee_id: uuid.UUID,
    service_id: uuid.UUID,
    day: date,
) -> list[tuple[datetime, datetime]]:
    """Lista horários livres no dia, reaproveitando `appointment_service.
    validate_schedule` para cada candidato — não duplica nenhuma regra de
    conflito, só gera os candidatos e descarta os que a validação recusa.

    Checagens que não dependem do horário (profissional/serviço inativos,
    profissional não realiza o serviço) são feitas uma vez, de antemão, e
    levantam erro — um dia fechado ou totalmente ocupado, por outro lado,
    resulta legitimamente numa lista vazia, não um erro."""
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is None:
        raise NotFoundError("Barbearia não encontrada.")
    if tenant.scheduling_mode != SchedulingMode.TIME_SLOT:
        return []

    employee = EmployeeRepository(db, tenant_id).get_by_id(employee_id)
    if employee is None:
        raise NotFoundError("Profissional não encontrado.")
    if not employee.is_active:
        raise DomainError("Este profissional está inativo.")

    service = ServiceRepository(db, tenant_id).get_by_id(service_id)
    if service is None:
        raise NotFoundError("Serviço não encontrado.")
    if not service.is_active:
        raise DomainError("Este serviço está desativado.")
    if not appointment_service.employee_offers_service(employee, service.id):
        raise DomainError("Este profissional não realiza o serviço selecionado.")

    business_hours = BusinessHoursRepository(db, tenant_id).get_by_weekday(day.weekday())
    if (
        business_hours is None
        or not business_hours.is_open
        or business_hours.open_time is None
        or business_hours.close_time is None
    ):
        return []
    if BlockedDateRepository(db, tenant_id).is_blocked(day):
        return []

    step = timedelta(minutes=service.duration_minutes)
    current = datetime.combine(day, business_hours.open_time, tzinfo=BR_TIMEZONE)
    close_at = datetime.combine(day, business_hours.close_time, tzinfo=BR_TIMEZONE)

    slots: list[tuple[datetime, datetime]] = []
    while current + step <= close_at:
        try:
            ends_at = appointment_service.validate_schedule(
                db,
                tenant_id,
                employee=employee,
                service_id=service.id,
                starts_at=current,
                duration_minutes=service.duration_minutes,
            )
        except DomainError:
            pass
        else:
            slots.append((current, ends_at))
        current += step

    return slots
