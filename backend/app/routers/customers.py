import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.customer import CustomerCreate, CustomerRead, CustomerUpdate
from app.services import customer_service

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=Page[CustomerRead])
def list_customers(
    q: str | None = Query(default=None, description="Busca por nome, telefone ou e-mail"),
    is_active: bool | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("clients.view")),
    db: Session = Depends(get_db),
):
    items, total = customer_service.list_customers(
        db, current_user.tenant_id, query=q, is_active=is_active, page=page, limit=limit
    )
    return Page(items=items, total=total, page=page, limit=limit)


@router.post("", response_model=CustomerRead, status_code=201)
def create_customer(
    payload: CustomerCreate,
    current_user: CurrentUser = Depends(require_permission("clients.create")),
    db: Session = Depends(get_db),
):
    return customer_service.create_customer(db, current_user.tenant_id, payload)


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("clients.view")),
    db: Session = Depends(get_db),
):
    return customer_service.get_customer(db, current_user.tenant_id, customer_id)


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: uuid.UUID,
    payload: CustomerUpdate,
    current_user: CurrentUser = Depends(require_permission("clients.edit")),
    db: Session = Depends(get_db),
):
    return customer_service.update_customer(db, current_user.tenant_id, customer_id, payload)


@router.post("/{customer_id}/deactivate", response_model=CustomerRead)
def deactivate_customer(
    customer_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("clients.delete")),
    db: Session = Depends(get_db),
):
    return customer_service.deactivate_customer(db, current_user.tenant_id, customer_id)


@router.post("/{customer_id}/reactivate", response_model=CustomerRead)
def reactivate_customer(
    customer_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("clients.edit")),
    db: Session = Depends(get_db),
):
    return customer_service.reactivate_customer(db, current_user.tenant_id, customer_id)
