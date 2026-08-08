import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.models.employee import Employee, EmployeeService
from app.repositories.base import TenantScopedRepository


class EmployeeRepository(TenantScopedRepository[Employee]):
    model = Employee

    def _with_services(self, stmt):
        return stmt.options(selectinload(Employee.services).selectinload(EmployeeService.service))

    def get_by_id(self, entity_id: uuid.UUID) -> Employee | None:
        stmt = self._with_services(self._scoped()).where(Employee.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def search(
        self,
        *,
        query: str | None = None,
        is_active: bool | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Employee], int]:
        stmt = self._scoped()

        if query:
            like = f"%{query}%"
            stmt = stmt.where(
                or_(
                    Employee.full_name.ilike(like),
                    Employee.phone.ilike(like),
                    Employee.email.ilike(like),
                )
            )

        if is_active is not None:
            stmt = stmt.where(Employee.is_active == is_active)

        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

        stmt = self._with_services(stmt).order_by(Employee.full_name)
        stmt = stmt.offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).unique().scalars().all())

        return items, total

    def get_by_user_id(self, user_id: uuid.UUID) -> Employee | None:
        stmt = self._scoped().where(Employee.user_id == user_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def replace_services(self, employee: Employee, service_ids: list[uuid.UUID]) -> None:
        for link in list(employee.services):
            self.db.delete(link)
        self.db.flush()
        for service_id in service_ids:
            self.db.add(EmployeeService(employee_id=employee.id, service_id=service_id))
        self.db.flush()
