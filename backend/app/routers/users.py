import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.core.exceptions import EmailAlreadyExistsError, NotFoundError
from app.core.security import hash_password
from app.db.session import get_db
from app.models.permission import Permission
from app.models.user import User
from app.repositories.role_repository import RoleRepository
from app.repositories.user_repository import UserRepository, find_user_by_email_global
from app.schemas.user import UserCreate, UserPermissionOverrideUpdate, UserRead, UserUpdate
from app.services import audit_service, permission_service
from app.services.permission_service import get_effective_permissions

router = APIRouter(prefix="/api/users", tags=["users"])


def _to_user_read(db: Session, user: User) -> UserRead:
    permissions = sorted(get_effective_permissions(db, user))
    return UserRead.model_validate(user).model_copy(update={"permissions": permissions})


@router.get("", response_model=list[UserRead])
def list_users(
    current_user: CurrentUser = Depends(require_permission("employees.view")),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db, current_user.tenant_id)
    return [_to_user_read(db, u) for u in repo.list_all()]


@router.post("", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    current_user: CurrentUser = Depends(require_permission("employees.create")),
    db: Session = Depends(get_db),
):
    if find_user_by_email_global(db, payload.email) is not None:
        raise EmailAlreadyExistsError()

    role_repo = RoleRepository(db)
    role = role_repo.get_by_code(payload.role_code)
    if role is None:
        raise NotFoundError("Cargo informado não existe.")

    repo = UserRepository(db, current_user.tenant_id)
    user = repo.add(
        User(
            full_name=payload.full_name,
            email=payload.email,
            hashed_password=hash_password(payload.password),
            phone=payload.phone,
            role_id=role.id,
        )
    )
    db.commit()
    return _to_user_read(db, user)


@router.patch("/{user_id}", response_model=UserRead)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    current_user: CurrentUser = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db, current_user.tenant_id)
    user = repo.get_by_id(user_id)
    if user is None:
        raise NotFoundError("Funcionário não encontrado.")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role_code is not None:
        role = RoleRepository(db).get_by_code(payload.role_code)
        if role is None:
            raise NotFoundError("Cargo informado não existe.")
        user.role_id = role.id

    db.commit()
    return _to_user_read(db, user)


@router.put("/{user_id}/permissions", response_model=UserRead)
def update_user_permission(
    user_id: uuid.UUID,
    payload: UserPermissionOverrideUpdate,
    current_user: CurrentUser = Depends(require_permission("employees.edit")),
    db: Session = Depends(get_db),
):
    repo = UserRepository(db, current_user.tenant_id)
    user = repo.get_by_id(user_id)
    if user is None:
        raise NotFoundError("Funcionário não encontrado.")

    permission = db.execute(
        select(Permission).where(Permission.code == payload.permission_code)
    ).scalar_one_or_none()
    if permission is None:
        raise NotFoundError("Permissão informada não existe.")

    permission_service.set_user_permission_override(db, user.id, permission.id, payload.granted)
    audit_service.log_user_action(
        db,
        tenant_id=current_user.tenant_id,
        user_id=current_user.user.id,
        action="user_permission.override",
        resource_type="user",
        resource_id=user.id,
        metadata={"permission_code": payload.permission_code, "granted": payload.granted},
    )
    db.commit()
    return _to_user_read(db, user)
