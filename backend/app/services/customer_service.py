import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.customer import Customer
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer import CustomerCreate, CustomerUpdate


def list_customers(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    query: str | None,
    is_active: bool | None,
    page: int,
    limit: int,
) -> tuple[list[Customer], int]:
    repo = CustomerRepository(db, tenant_id)
    return repo.search(query=query, is_active=is_active, page=page, limit=limit)


def get_customer(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> Customer:
    repo = CustomerRepository(db, tenant_id)
    customer = repo.get_by_id(customer_id)
    if customer is None:
        raise NotFoundError("Cliente não encontrado.")
    return customer


def create_customer(db: Session, tenant_id: uuid.UUID, payload: CustomerCreate) -> Customer:
    repo = CustomerRepository(db, tenant_id)
    customer = repo.add(Customer(**payload.model_dump()))
    db.commit()
    return customer


def update_customer(
    db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID, payload: CustomerUpdate
) -> Customer:
    customer = get_customer(db, tenant_id, customer_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    db.commit()
    return customer


def deactivate_customer(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> Customer:
    customer = get_customer(db, tenant_id, customer_id)
    customer.is_active = False
    db.commit()
    return customer


def reactivate_customer(db: Session, tenant_id: uuid.UUID, customer_id: uuid.UUID) -> Customer:
    customer = get_customer(db, tenant_id, customer_id)
    customer.is_active = True
    db.commit()
    return customer
