from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission, RolePermission
from app.models.role import Role


class RoleRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_code(self, code: str) -> Role | None:
        stmt = select(Role).where(Role.code == code)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_default_permission_codes(self, role_id) -> set[str]:
        stmt = (
            select(Permission.code)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(RolePermission.role_id == role_id)
        )
        return set(self.db.execute(stmt).scalars().all())
