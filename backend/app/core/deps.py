import uuid
from dataclasses import dataclass, field
from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.exceptions import (
    InvalidOrExpiredTokenError,
    PermissionDeniedError,
    SubscriptionRequiredError,
)
from app.core.security import decode_token
from app.db.session import get_db
from app.models.client_account import ClientAccount
from app.models.user import User
from app.repositories.client_account_repository import ClientAccountRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.user_repository import UserRepository
from app.services.permission_service import get_effective_permissions
from app.services.subscription_service import is_usable


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


@dataclass
class CurrentClient:
    """Identidade do domínio de CLIENTE — nunca compartilha dependency com
    `CurrentUser`/`get_current_user` (staff). Um token de cliente tem
    `type == "client_access"`, o que já basta para ser rejeitado por
    `get_current_user`, e vice-versa: nenhum dos dois aceita o token do
    outro domínio."""

    client: ClientAccount


def get_current_client(
    db: Annotated[Session, Depends(get_db)],
    authorization: Annotated[str | None, Header()] = None,
) -> CurrentClient:
    token = _extract_bearer_token(authorization)
    try:
        payload = decode_token(token)
    except Exception as exc:
        raise InvalidOrExpiredTokenError() from exc

    if payload.get("type") != "client_access":
        raise InvalidOrExpiredTokenError()

    try:
        client_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise InvalidOrExpiredTokenError() from exc

    client = ClientAccountRepository(db).get_by_id(client_id)
    if client is None or not client.is_active:
        raise InvalidOrExpiredTokenError()

    return CurrentClient(client=client)


CurrentClientDep = Annotated[CurrentClient, Depends(get_current_client)]


_SUBSCRIPTION_EXEMPT_MODULES = {"settings", "audit", "notifications"}
"""`settings` (configurações da barbearia, incluindo a própria tela de
assinatura/recebimento), `audit` (histórico só-leitura) e `notifications`
nunca são bloqueados por assinatura vencida — senão o dono ficaria sem como
resolver o próprio problema, sem enxergar o que aconteceu na conta bem na
hora em que mais precisa, ou pior: sem nem ver a notificação que avisa que
o pagamento falhou. Todo o resto (seção 11: "recursos de gerenciamento da
barbearia") exige assinatura utilizável (TRIAL ou ACTIVE)."""


def require_permission(permission_code: str):
    """Dependency factory: garante que o usuário autenticado possui a
    permissão informada (nunca confia em role — sempre checa a permissão
    efetiva, role + overrides, calculada em get_current_user) e, para
    módulos operacionais, que a assinatura da barbearia está utilizável."""

    module = permission_code.split(".")[0]

    def _checker(
        current_user: CurrentUserDep, db: Annotated[Session, Depends(get_db)]
    ) -> CurrentUser:
        if not current_user.has_permission(permission_code):
            raise PermissionDeniedError()

        if module not in _SUBSCRIPTION_EXEMPT_MODULES:
            subscription = SubscriptionRepository(db, current_user.tenant_id).get_current()
            if subscription is None or not is_usable(subscription):
                raise SubscriptionRequiredError()

        return current_user

    return _checker
