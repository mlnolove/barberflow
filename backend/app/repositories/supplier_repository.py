from app.models.supplier import Supplier
from app.repositories.base import TenantScopedRepository


class SupplierRepository(TenantScopedRepository[Supplier]):
    model = Supplier
