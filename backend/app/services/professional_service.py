import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.employee import Employee
from app.repositories.employee_repository import EmployeeRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.user_repository import UserRepository
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.schemas.service import ServiceSummary


def to_employee_read(employee: Employee) -> EmployeeRead:
    services = [ServiceSummary.model_validate(link.service) for link in employee.services]
    data = {
        "id": employee.id,
        "user_id": employee.user_id,
        "full_name": employee.full_name,
        "phone": employee.phone,
        "email": employee.email,
        "role_title": employee.role_title,
        "specialties": employee.specialties,
        "commission_percentage": employee.commission_percentage,
        "work_start_time": employee.work_start_time,
        "work_end_time": employee.work_end_time,
        "work_days": employee.work_days,
        "is_active": employee.is_active,
        "created_at": employee.created_at,
        "services": services,
    }
    return EmployeeRead.model_validate(data)


def _validate_service_ids(db: Session, tenant_id: uuid.UUID, service_ids: list[uuid.UUID]) -> None:
    repo = ServiceRepository(db, tenant_id)
    for service_id in service_ids:
        if repo.get_by_id(service_id) is None:
            raise NotFoundError("Um dos serviços informados não existe.")


def _validate_user_link(
    db: Session,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    ignore_employee_id: uuid.UUID | None = None,
) -> None:
    if UserRepository(db, tenant_id).get_by_id(user_id) is None:
        raise NotFoundError("Usuário informado não existe.")

    existing = EmployeeRepository(db, tenant_id).get_by_user_id(user_id)
    if existing is not None and existing.id != ignore_employee_id:
        raise ConflictError("Este usuário já está vinculado a outro profissional.")


def list_employees(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    query: str | None,
    is_active: bool | None,
    page: int,
    limit: int,
) -> tuple[list[Employee], int]:
    repo = EmployeeRepository(db, tenant_id)
    return repo.search(query=query, is_active=is_active, page=page, limit=limit)


def get_employee(db: Session, tenant_id: uuid.UUID, employee_id: uuid.UUID) -> Employee:
    repo = EmployeeRepository(db, tenant_id)
    employee = repo.get_by_id(employee_id)
    if employee is None:
        raise NotFoundError("Profissional não encontrado.")
    return employee


def create_employee(db: Session, tenant_id: uuid.UUID, payload: EmployeeCreate) -> Employee:
    if payload.user_id:
        _validate_user_link(db, tenant_id, payload.user_id)
    _validate_service_ids(db, tenant_id, payload.service_ids)

    repo = EmployeeRepository(db, tenant_id)
    data = payload.model_dump(exclude={"service_ids"})
    employee = repo.add(Employee(**data))
    repo.replace_services(employee, payload.service_ids)
    db.commit()

    return get_employee(db, tenant_id, employee.id)


def update_employee(
    db: Session, tenant_id: uuid.UUID, employee_id: uuid.UUID, payload: EmployeeUpdate
) -> Employee:
    employee = get_employee(db, tenant_id, employee_id)

    if payload.user_id is not None:
        _validate_user_link(db, tenant_id, payload.user_id, ignore_employee_id=employee.id)

    updates = payload.model_dump(exclude_unset=True, exclude={"service_ids"})
    for field, value in updates.items():
        setattr(employee, field, value)

    if payload.service_ids is not None:
        _validate_service_ids(db, tenant_id, payload.service_ids)
        EmployeeRepository(db, tenant_id).replace_services(employee, payload.service_ids)

    db.commit()
    return get_employee(db, tenant_id, employee_id)


def deactivate_employee(db: Session, tenant_id: uuid.UUID, employee_id: uuid.UUID) -> Employee:
    employee = get_employee(db, tenant_id, employee_id)
    employee.is_active = False
    db.commit()
    return get_employee(db, tenant_id, employee_id)


def reactivate_employee(db: Session, tenant_id: uuid.UUID, employee_id: uuid.UUID) -> Employee:
    employee = get_employee(db, tenant_id, employee_id)
    employee.is_active = True
    db.commit()
    return get_employee(db, tenant_id, employee_id)
