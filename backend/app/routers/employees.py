import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.employee import EmployeeCreate, EmployeeRead, EmployeeUpdate
from app.services import professional_service

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("", response_model=Page[EmployeeRead])
def list_employees(
    q: str | None = Query(default=None, description="Busca por nome, telefone ou e-mail"),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    items, total = professional_service.list_employees(
        db, current_user.tenant_id, query=q, is_active=is_active, page=page, limit=limit
    )
    return Page(
        items=[professional_service.to_employee_read(e) for e in items],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("", response_model=EmployeeRead, status_code=201)
def create_employee(
    payload: EmployeeCreate,
    current_user: CurrentUser = Depends(require_permission("employees.create")),
    db: Session = Depends(get_db),
):
    employee = professional_service.create_employee(db, current_user.tenant_id, payload)
    return professional_service.to_employee_read(employee)


@router.get("/{employee_id}", response_model=EmployeeRead)
def get_employee(
    employee_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    employee = professional_service.get_employee(db, current_user.tenant_id, employee_id)
    return professional_service.to_employee_read(employee)


@router.patch("/{employee_id}", response_model=EmployeeRead)
def update_employee(
    employee_id: uuid.UUID,
    payload: EmployeeUpdate,
    current_user: CurrentUser = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    employee = professional_service.update_employee(
        db, current_user.tenant_id, employee_id, payload
    )
    return professional_service.to_employee_read(employee)


@router.post("/{employee_id}/deactivate", response_model=EmployeeRead)
def deactivate_employee(
    employee_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("employees.delete")),
    db: Session = Depends(get_db),
):
    employee = professional_service.deactivate_employee(db, current_user.tenant_id, employee_id)
    return professional_service.to_employee_read(employee)


@router.post("/{employee_id}/reactivate", response_model=EmployeeRead)
def reactivate_employee(
    employee_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    employee = professional_service.reactivate_employee(db, current_user.tenant_id, employee_id)
    return professional_service.to_employee_read(employee)
