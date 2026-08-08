import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.supplier import Supplier
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.supplier import SupplierCreate, SupplierUpdate


def list_suppliers(db: Session, tenant_id: uuid.UUID) -> list[Supplier]:
    return SupplierRepository(db, tenant_id).list_all()


def get_supplier(db: Session, tenant_id: uuid.UUID, supplier_id: uuid.UUID) -> Supplier:
    supplier = SupplierRepository(db, tenant_id).get_by_id(supplier_id)
    if supplier is None:
        raise NotFoundError("Fornecedor não encontrado.")
    return supplier


def create_supplier(db: Session, tenant_id: uuid.UUID, payload: SupplierCreate) -> Supplier:
    repo = SupplierRepository(db, tenant_id)
    supplier = repo.add(Supplier(**payload.model_dump()))
    db.commit()
    return supplier


def update_supplier(
    db: Session, tenant_id: uuid.UUID, supplier_id: uuid.UUID, payload: SupplierUpdate
) -> Supplier:
    supplier = get_supplier(db, tenant_id, supplier_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    db.commit()
    return supplier


def deactivate_supplier(db: Session, tenant_id: uuid.UUID, supplier_id: uuid.UUID) -> Supplier:
    supplier = get_supplier(db, tenant_id, supplier_id)
    supplier.is_active = False
    db.commit()
    return supplier


def reactivate_supplier(db: Session, tenant_id: uuid.UUID, supplier_id: uuid.UUID) -> Supplier:
    supplier = get_supplier(db, tenant_id, supplier_id)
    supplier.is_active = True
    db.commit()
    return supplier
