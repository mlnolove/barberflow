import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.supplier import SupplierCreate, SupplierRead, SupplierUpdate
from app.services import supplier_service

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierRead])
def list_suppliers(
    current_user: CurrentUser = Depends(require_permission("inventory.view")),
    db: Session = Depends(get_db),
):
    return supplier_service.list_suppliers(db, current_user.tenant_id)


@router.post("", response_model=SupplierRead, status_code=201)
def create_supplier(
    payload: SupplierCreate,
    current_user: CurrentUser = Depends(require_permission("inventory.create")),
    db: Session = Depends(get_db),
):
    return supplier_service.create_supplier(db, current_user.tenant_id, payload)


@router.get("/{supplier_id}", response_model=SupplierRead)
def get_supplier(
    supplier_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("inventory.view")),
    db: Session = Depends(get_db),
):
    return supplier_service.get_supplier(db, current_user.tenant_id, supplier_id)


@router.patch("/{supplier_id}", response_model=SupplierRead)
def update_supplier(
    supplier_id: uuid.UUID,
    payload: SupplierUpdate,
    current_user: CurrentUser = Depends(require_permission("inventory.edit")),
    db: Session = Depends(get_db),
):
    return supplier_service.update_supplier(db, current_user.tenant_id, supplier_id, payload)


@router.post("/{supplier_id}/deactivate", response_model=SupplierRead)
def deactivate_supplier(
    supplier_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("inventory.edit")),
    db: Session = Depends(get_db),
):
    return supplier_service.deactivate_supplier(db, current_user.tenant_id, supplier_id)


@router.post("/{supplier_id}/reactivate", response_model=SupplierRead)
def reactivate_supplier(
    supplier_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("inventory.edit")),
    db: Session = Depends(get_db),
):
    return supplier_service.reactivate_supplier(db, current_user.tenant_id, supplier_id)
