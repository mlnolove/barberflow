from app.models.payment_method import PaymentMethod
from app.repositories.base import TenantScopedRepository


class PaymentMethodRepository(TenantScopedRepository[PaymentMethod]):
    model = PaymentMethod

    def get_by_code(self, code: str) -> PaymentMethod | None:
        stmt = self._scoped().where(PaymentMethod.code == code)
        return self.db.execute(stmt).scalar_one_or_none()
