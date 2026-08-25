from app.models.financial_account import FinancialAccount
from app.repositories.base import TenantScopedRepository


class FinancialAccountRepository(TenantScopedRepository[FinancialAccount]):
    model = FinancialAccount

    def get_current(self) -> FinancialAccount | None:
        return self.db.execute(self._scoped()).scalar_one_or_none()
