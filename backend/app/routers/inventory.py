import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.inventory_movement import (
    InventoryMovementRead,
    StockAdjustmentCreate,
    StockMovementCreate,
)
from app.schemas.product import ProductCreate, ProductRead, ProductUpdate
from app.services import inventory_service

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("/products", response_model=Page[ProductRead])
def list_products(
    q: str | None = Query(default=None, description="Busca por nome, SKU ou categoria"),
    is_active: bool | None = Query(default=None),
    low_stock: bool = Query(default=False),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("inventory.view")),
    db: Session = Depends(get_db),
):
    items, total = inventory_service.list_products(
        db,
        current_user.tenant_id,
        query=q,
        is_active=is_active,
        low_stock=low_stock,
        page=page,
        limit=limit,
    )
    return Page(items=items, total=total, page=page, limit=limit)


@router.post("/products", response_model=ProductRead, status_code=201)
def create_product(
    payload: ProductCreate,
    current_user: CurrentUser = Depends(require_permission("inventory.create")),
    db: Session = Depends(get_db),
):
    return inventory_service.create_product(
        db, current_user.tenant_id, current_user.user.id, payload
    )


@router.get("/products/{product_id}", response_model=ProductRead)
def get_product(
    product_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("inventory.view")),
    db: Session = Depends(get_db),
):
    return inventory_service.get_product(db, current_user.tenant_id, product_id)


@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    current_user: CurrentUser = Depends(require_permission("inventory.edit")),
    db: Session = Depends(get_db),
):
    return inventory_service.update_product(db, current_user.tenant_id, product_id, payload)


@router.post("/products/{product_id}/deactivate", response_model=ProductRead)
def deactivate_product(
    product_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("inventory.edit")),
    db: Session = Depends(get_db),
):
    return inventory_service.deactivate_product(db, current_user.tenant_id, product_id)


@router.post("/products/{product_id}/reactivate", response_model=ProductRead)
def reactivate_product(
    product_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("inventory.edit")),
    db: Session = Depends(get_db),
):
    return inventory_service.reactivate_product(db, current_user.tenant_id, product_id)


@router.post("/products/{product_id}/movements", response_model=ProductRead)
def create_stock_movement(
    product_id: uuid.UUID,
    payload: StockMovementCreate,
    current_user: CurrentUser = Depends(require_permission("inventory.edit")),
    db: Session = Depends(get_db),
):
    return inventory_service.create_stock_movement(
        db, current_user.tenant_id, product_id, current_user.user.id, payload
    )


@router.post("/products/{product_id}/adjust", response_model=ProductRead)
def create_stock_adjustment(
    product_id: uuid.UUID,
    payload: StockAdjustmentCreate,
    current_user: CurrentUser = Depends(require_permission("inventory.adjust")),
    db: Session = Depends(get_db),
):
    return inventory_service.create_stock_adjustment(
        db, current_user.tenant_id, product_id, current_user.user.id, payload
    )


@router.get("/products/{product_id}/movements", response_model=Page[InventoryMovementRead])
def list_movements(
    product_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("inventory.view")),
    db: Session = Depends(get_db),
):
    items, total = inventory_service.list_movements(
        db, current_user.tenant_id, product_id, page=page, limit=limit
    )
    return Page(items=items, total=total, page=page, limit=limit)
