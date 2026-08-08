import uuid
from datetime import time

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.business_hours import BlockedDate, BusinessHours
from app.repositories.blocked_date_repository import BlockedDateRepository
from app.repositories.business_hours_repository import BusinessHoursRepository
from app.schemas.scheduling import BlockedDateCreate, BusinessHoursUpdate


def seed_default_business_hours(db: Session, tenant_id: uuid.UUID) -> None:
    """Segunda a sábado 09h-19h, domingo fechado — ajustável depois em
    Configurações (Fase 8). Sem isso a agenda não teria horário válido.
    Idempotente: não faz nada se o tenant já tiver horários definidos."""
    if BusinessHoursRepository(db, tenant_id).list_all():
        return
    for weekday in range(7):
        is_open = weekday != 6
        db.add(
            BusinessHours(
                tenant_id=tenant_id,
                weekday=weekday,
                is_open=is_open,
                open_time=time(9, 0) if is_open else None,
                close_time=time(19, 0) if is_open else None,
            )
        )
    db.flush()


def list_business_hours(db: Session, tenant_id: uuid.UUID) -> list[BusinessHours]:
    repo = BusinessHoursRepository(db, tenant_id)
    return sorted(repo.list_all(), key=lambda bh: bh.weekday)


def update_business_hours(
    db: Session, tenant_id: uuid.UUID, weekday: int, payload: BusinessHoursUpdate
) -> BusinessHours:
    repo = BusinessHoursRepository(db, tenant_id)
    business_hours = repo.get_by_weekday(weekday)
    if business_hours is None:
        raise NotFoundError("Dia da semana inválido.")

    business_hours.is_open = payload.is_open
    business_hours.open_time = payload.open_time
    business_hours.close_time = payload.close_time
    business_hours.break_start_time = payload.break_start_time
    business_hours.break_end_time = payload.break_end_time
    db.commit()
    return business_hours


def list_blocked_dates(db: Session, tenant_id: uuid.UUID) -> list[BlockedDate]:
    repo = BlockedDateRepository(db, tenant_id)
    return sorted(repo.list_all(), key=lambda bd: bd.date)


def create_blocked_date(
    db: Session, tenant_id: uuid.UUID, payload: BlockedDateCreate
) -> BlockedDate:
    if BlockedDateRepository(db, tenant_id).is_blocked(payload.date):
        raise ConflictError("Esta data já está bloqueada.")

    repo = BlockedDateRepository(db, tenant_id)
    blocked = repo.add(BlockedDate(date=payload.date, reason=payload.reason))
    db.commit()
    return blocked


def delete_blocked_date(db: Session, tenant_id: uuid.UUID, blocked_date_id: uuid.UUID) -> None:
    repo = BlockedDateRepository(db, tenant_id)
    blocked = repo.get_by_id(blocked_date_id)
    if blocked is None:
        raise NotFoundError("Data bloqueada não encontrada.")
    repo.delete(blocked)
    db.commit()
