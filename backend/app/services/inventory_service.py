import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, DomainError, NotFoundError
from app.models.inventory_movement import InventoryMovement, InventoryMovementType
from app.models.product import Product
from app.repositories.inventory_movement_repository import InventoryMovementRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.supplier_repository import SupplierRepository
from app.schemas.inventory_movement import (
    ManualMovementType,
    StockAdjustmentCreate,
    StockMovementCreate,
)
from app.schemas.product import ProductCreate, ProductUpdate

_INCREASE_TYPES = {ManualMovementType.ENTRY, ManualMovementType.RETURN}


def list_products(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    query: str | None,
    is_active: bool | None,
    low_stock: bool,
    page: int,
    limit: int,
) -> tuple[list[Product], int]:
    repo = ProductRepository(db, tenant_id)
    return repo.search(
        query=query, is_active=is_active, low_stock=low_stock, page=page, limit=limit
    )


def get_product(db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    product = ProductRepository(db, tenant_id).get_by_id(product_id)
    if product is None:
        raise NotFoundError("Produto não encontrado.")
    return product


def _validate_sku_unique(
    db: Session,
    tenant_id: uuid.UUID,
    sku: str | None,
    *,
    ignore_product_id: uuid.UUID | None = None,
) -> None:
    if not sku:
        return
    existing = ProductRepository(db, tenant_id).get_by_sku(sku)
    if existing is not None and existing.id != ignore_product_id:
        raise ConflictError("Já existe um produto com este SKU.")


def _validate_supplier(db: Session, tenant_id: uuid.UUID, supplier_id: uuid.UUID | None) -> None:
    if supplier_id is None:
        return
    if SupplierRepository(db, tenant_id).get_by_id(supplier_id) is None:
        raise NotFoundError("Fornecedor não encontrado.")


def _apply_movement(
    db: Session,
    tenant_id: uuid.UUID,
    product: Product,
    *,
    movement_type: InventoryMovementType,
    quantity_change: int,
    reason: str,
    user_id: uuid.UUID,
) -> InventoryMovement:
    quantity_before = product.current_quantity
    quantity_after = quantity_before + quantity_change
    if quantity_after < 0:
        raise DomainError("Estoque insuficiente para esta operação.")

    product.current_quantity = quantity_after

    repo = InventoryMovementRepository(db, tenant_id)
    movement = repo.add(
        InventoryMovement(
            product_id=product.id,
            type=movement_type,
            quantity_change=quantity_change,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            reason=reason,
            created_by_user_id=user_id,
        )
    )
    db.flush()
    return movement


def create_product(
    db: Session, tenant_id: uuid.UUID, user_id: uuid.UUID, payload: ProductCreate
) -> Product:
    _validate_sku_unique(db, tenant_id, payload.sku)
    _validate_supplier(db, tenant_id, payload.supplier_id)

    repo = ProductRepository(db, tenant_id)
    data = payload.model_dump(exclude={"initial_quantity"})
    product = repo.add(Product(**data, current_quantity=0))
    db.flush()

    if payload.initial_quantity > 0:
        _apply_movement(
            db,
            tenant_id,
            product,
            movement_type=InventoryMovementType.ENTRY,
            quantity_change=payload.initial_quantity,
            reason="Estoque inicial",
            user_id=user_id,
        )

    db.commit()
    return get_product(db, tenant_id, product.id)


def update_product(
    db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID, payload: ProductUpdate
) -> Product:
    product = get_product(db, tenant_id, product_id)

    if payload.sku is not None:
        _validate_sku_unique(db, tenant_id, payload.sku, ignore_product_id=product.id)
    if payload.supplier_id is not None:
        _validate_supplier(db, tenant_id, payload.supplier_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    return get_product(db, tenant_id, product_id)


def deactivate_product(db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    product = get_product(db, tenant_id, product_id)
    product.is_active = False
    db.commit()
    return get_product(db, tenant_id, product_id)


def reactivate_product(db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    product = get_product(db, tenant_id, product_id)
    product.is_active = True
    db.commit()
    return get_product(db, tenant_id, product_id)


def create_stock_movement(
    db: Session,
    tenant_id: uuid.UUID,
    product_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: StockMovementCreate,
    *,
    commit: bool = True,
) -> Product:
    product = get_product(db, tenant_id, product_id)
    sign = 1 if payload.type in _INCREASE_TYPES else -1
    _apply_movement(
        db,
        tenant_id,
        product,
        movement_type=InventoryMovementType(payload.type.value),
        quantity_change=sign * payload.quantity,
        reason=payload.reason,
        user_id=user_id,
    )
    if commit:
        db.commit()
    else:
        db.flush()
    return get_product(db, tenant_id, product_id)


def create_stock_adjustment(
    db: Session,
    tenant_id: uuid.UUID,
    product_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: StockAdjustmentCreate,
) -> Product:
    product = get_product(db, tenant_id, product_id)
    quantity_change = payload.new_quantity - product.current_quantity
    _apply_movement(
        db,
        tenant_id,
        product,
        movement_type=InventoryMovementType.ADJUSTMENT,
        quantity_change=quantity_change,
        reason=payload.reason,
        user_id=user_id,
    )
    db.commit()
    return get_product(db, tenant_id, product_id)


def list_movements(
    db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID, *, page: int, limit: int
):
    get_product(db, tenant_id, product_id)
    repo = InventoryMovementRepository(db, tenant_id)
    return repo.list_by_product(product_id, page=page, limit=limit)
