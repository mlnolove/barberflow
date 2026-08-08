from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload

from app.models.financial_transaction import FinancialTransaction, FinancialTransactionType
from app.repositories.base import TenantScopedRepository


class FinancialTransactionRepository(TenantScopedRepository[FinancialTransaction]):
    model = FinancialTransaction

    def _with_payment_method(self, stmt):
        return stmt.options(joinedload(FinancialTransaction.payment_method))

    def get_by_id(self, entity_id):
        stmt = self._with_payment_method(self._scoped()).where(FinancialTransaction.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def search(
        self,
        *,
        type_: FinancialTransactionType | None = None,
        category: str | None = None,
        payment_method_id=None,
        date_from: date | None = None,
        date_to: date | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[FinancialTransaction], int]:
        stmt = self._scoped()

        if type_ is not None:
            stmt = stmt.where(FinancialTransaction.type == type_)
        if category:
            stmt = stmt.where(FinancialTransaction.category == category)
        if payment_method_id:
            stmt = stmt.where(FinancialTransaction.payment_method_id == payment_method_id)
        if date_from:
            stmt = stmt.where(FinancialTransaction.transaction_date >= date_from)
        if date_to:
            stmt = stmt.where(FinancialTransaction.transaction_date <= date_to)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        stmt = self._with_payment_method(stmt)
        stmt = stmt.order_by(
            FinancialTransaction.transaction_date.desc(), FinancialTransaction.created_at.desc()
        )
        stmt = stmt.offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).unique().scalars().all())

        return items, total

    def summary(self, *, date_from: date, date_to: date) -> dict:
        """Soma TODAS as transações do período, incluindo as estornadas.

        Uma transação estornada e seu estorno têm o mesmo valor com efeito
        contábil oposto (seção 50: correção é uma nova transação, não uma
        edição) — somar as duas naturalmente neutraliza o efeito no saldo.
        Excluir a original e contar só o estorno inflaria o saldo.
        """
        stmt = (
            select(
                FinancialTransaction.type, func.coalesce(func.sum(FinancialTransaction.amount), 0)
            )
            .where(
                FinancialTransaction.tenant_id == self.tenant_id,
                FinancialTransaction.transaction_date >= date_from,
                FinancialTransaction.transaction_date <= date_to,
            )
            .group_by(FinancialTransaction.type)
        )
        totals = dict(self.db.execute(stmt).all())

        count_stmt = select(func.count()).where(
            FinancialTransaction.tenant_id == self.tenant_id,
            FinancialTransaction.transaction_date >= date_from,
            FinancialTransaction.transaction_date <= date_to,
        )
        count = self.db.scalar(count_stmt) or 0

        income = totals.get(FinancialTransactionType.INCOME, 0)
        expense = totals.get(FinancialTransactionType.EXPENSE, 0)
        return {
            "total_income": income,
            "total_expense": expense,
            "balance": income - expense,
            "transaction_count": count,
        }
