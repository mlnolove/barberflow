import uuid
from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.exceptions import InvalidOrExpiredTokenError, PermissionDeniedError
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.permission_service import get_effective_permissions


@dataclass
class CurrentUser:
    user: User
    tenant_id: uuid.UUID
    permissions: set[str] = field(default_factory=set)

    def has_permission(self, code: str) -> bool:
        return code in self.permissions


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise InvalidOrExpiredTokenError()
    return authorization.split(" ", 1)[1].strip()


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentUser:
    token = _extract_bearer_token(authorization)
    try:
        payload = decode_token(token)
    except Exception as exc:
        raise InvalidOrExpiredTokenError() from exc

    if payload.get("type") != "access":
        raise InvalidOrExpiredTokenError()

    try:
        user_id = uuid.UUID(payload["sub"])
        tenant_id = uuid.UUID(payload["tenant_id"])
    except (KeyError, ValueError) as exc:
        raise InvalidOrExpiredTokenError() from exc

    user_repo = UserRepository(db, tenant_id)
    user = user_repo.get_by_id_with_role(user_id)
    if user is None or not user.is_active:
        raise InvalidOrExpiredTokenError()

    permissions = get_effective_permissions(db, user)
    return CurrentUser(user=user, tenant_id=tenant_id, permissions=permissions)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def require_permission(permission_code: str):
    """Dependency factory: garante que o usuário autenticado possui a
    permissão informada. Nunca confia em role — sempre checa a permissão
    efetiva (role + overrides) calculada em get_current_user."""

    def _checker(current_user: CurrentUserDep) -> CurrentUser:
        if not current_user.has_permission(permission_code):
            raise PermissionDeniedError()
        return current_user

    return _checker
