import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.tenant import Tenant


class TenantRepository:
    """Tenant é a raiz do isolamento multi-tenant, portanto não é ele mesmo
    tenant-scoped — este repositório não estende TenantScopedRepository."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, tenant_id: uuid.UUID) -> Tenant | None:
        return self.db.get(Tenant, tenant_id)

    def get_by_slug(self, slug: str) -> Tenant | None:
        stmt = select(Tenant).where(Tenant.slug == slug)
        return self.db.execute(stmt).scalar_one_or_none()

    def add(self, tenant: Tenant) -> Tenant:
        self.db.add(tenant)
        self.db.flush()
        return tenant
