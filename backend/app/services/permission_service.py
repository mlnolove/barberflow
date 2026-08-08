import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.permission import Permission, UserPermission
from app.models.user import User
from app.repositories.role_repository import RoleRepository


def get_effective_permissions(db: Session, user: User) -> set[str]:
    """Permissões efetivas = permissões padrão do role, com overrides
    individuais (grant/revoke) do usuário aplicados por cima."""
    role_repo = RoleRepository(db)
    effective = role_repo.get_default_permission_codes(user.role_id)

    stmt = (
        select(Permission.code, UserPermission.granted)
        .join(UserPermission, UserPermission.permission_id == Permission.id)
        .where(UserPermission.user_id == user.id)
    )
    for code, granted in db.execute(stmt).all():
        if granted:
            effective.add(code)
        else:
            effective.discard(code)

    return effective


def has_permission(db: Session, user: User, permission_code: str) -> bool:
    return permission_code in get_effective_permissions(db, user)


def set_user_permission_override(
    db: Session, user_id: uuid.UUID, permission_id: uuid.UUID, granted: bool
) -> UserPermission:
    stmt = select(UserPermission).where(
        UserPermission.user_id == user_id, UserPermission.permission_id == permission_id
    )
    override = db.execute(stmt).scalar_one_or_none()
    if override is None:
        override = UserPermission(user_id=user_id, permission_id=permission_id, granted=granted)
        db.add(override)
    else:
        override.granted = granted
    db.flush()
    return override
