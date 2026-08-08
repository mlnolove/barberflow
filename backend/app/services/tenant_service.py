import uuid

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.tenant import Tenant
from app.repositories.tenant_repository import TenantRepository
from app.schemas.tenant import TenantUpdate


def get_tenant(db: Session, tenant_id: uuid.UUID) -> Tenant:
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is None:
        raise NotFoundError("Barbearia não encontrada.")
    return tenant


def update_tenant(db: Session, tenant_id: uuid.UUID, payload: TenantUpdate) -> Tenant:
    tenant = get_tenant(db, tenant_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(tenant, field, value)
    db.commit()
    return tenant
