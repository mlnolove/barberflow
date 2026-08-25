import re
import unicodedata
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidOrExpiredTokenError,
)
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.tenant import Tenant
from app.models.user import User
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.role_repository import RoleRepository
from app.repositories.tenant_repository import TenantRepository
from app.repositories.user_repository import UserRepository, find_user_by_email_global
from app.schemas.auth import LoginRequest, TenantSignupRequest
from app.services.payment_method_service import seed_default_payment_methods
from app.services.scheduling_settings_service import seed_default_business_hours
from app.services.subscription_service import provision_trial_subscription


def _slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "barbearia"


def _unique_slug(db: Session, base_slug: str) -> str:
    tenant_repo = TenantRepository(db)
    slug = base_slug
    suffix = 1
    while tenant_repo.get_by_slug(slug) is not None:
        suffix += 1
        slug = f"{base_slug}-{suffix}"
    return slug


class AuthResult:
    def __init__(
        self, user: User, tenant: Tenant, access_token: str, refresh_token: str, expires_in: int
    ):
        self.user = user
        self.tenant = tenant
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_in = expires_in


def signup_tenant(db: Session, payload: TenantSignupRequest) -> AuthResult:
    if find_user_by_email_global(db, payload.owner_email) is not None:
        raise EmailAlreadyExistsError()

    tenant_repo = TenantRepository(db)
    role_repo = RoleRepository(db)

    slug = _unique_slug(db, _slugify(payload.tenant_name))
    tenant = tenant_repo.add(Tenant(name=payload.tenant_name, slug=slug))
    seed_default_business_hours(db, tenant.id)
    seed_default_payment_methods(db, tenant.id)
    provision_trial_subscription(db, tenant.id)

    owner_role = role_repo.get_by_code("OWNER")
    if owner_role is None:
        raise RuntimeError("Role OWNER não encontrado. Rode o seed inicial do banco.")

    owner = User(
        tenant_id=tenant.id,
        full_name=payload.owner_full_name,
        email=payload.owner_email,
        hashed_password=hash_password(payload.owner_password),
        role_id=owner_role.id,
    )
    db.add(owner)
    db.flush()

    return _issue_tokens(db, owner, tenant)


def login(db: Session, payload: LoginRequest) -> AuthResult:
    user = find_user_by_email_global(db, payload.email)
    if user is None or not user.is_active:
        raise InvalidCredentialsError()
    if not verify_password(payload.password, user.hashed_password):
        raise InvalidCredentialsError()

    tenant_repo = TenantRepository(db)
    tenant = tenant_repo.get_by_id(user.tenant_id)
    if tenant is None or not tenant.is_active:
        raise InvalidCredentialsError()

    return _issue_tokens(db, user, tenant)


def refresh_access_token(db: Session, refresh_token: str) -> AuthResult:
    try:
        payload = decode_token(refresh_token)
    except Exception as exc:
        raise InvalidOrExpiredTokenError() from exc

    if payload.get("type") != "refresh":
        raise InvalidOrExpiredTokenError()

    token_repo = RefreshTokenRepository(db)
    stored = token_repo.get_by_jti(payload["jti"])
    if stored is None or stored.revoked:
        raise InvalidOrExpiredTokenError()
    if stored.expires_at < datetime.now(UTC):
        raise InvalidOrExpiredTokenError()

    user_id = uuid.UUID(payload["sub"])
    tenant_id = uuid.UUID(payload["tenant_id"])

    user_repo = UserRepository(db, tenant_id)
    user = user_repo.get_by_id_with_role(user_id)
    if user is None or not user.is_active:
        raise InvalidOrExpiredTokenError()

    tenant_repo = TenantRepository(db)
    tenant = tenant_repo.get_by_id(tenant_id)
    if tenant is None or not tenant.is_active:
        raise InvalidOrExpiredTokenError()

    token_repo.revoke(stored)
    return _issue_tokens(db, user, tenant)


def logout(db: Session, refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token)
    except Exception:
        return
    token_repo = RefreshTokenRepository(db)
    stored = token_repo.get_by_jti(payload.get("jti", ""))
    if stored is not None:
        token_repo.revoke(stored)


def _issue_tokens(db: Session, user: User, tenant: Tenant) -> AuthResult:
    from app.core.config import settings

    access_token = create_access_token(user_id=str(user.id), tenant_id=str(tenant.id))
    refresh_token, jti, expires_at = create_refresh_token(
        user_id=str(user.id), tenant_id=str(tenant.id)
    )

    token_repo = RefreshTokenRepository(db)
    token_repo.add(RefreshToken(user_id=user.id, jti=jti, expires_at=expires_at))
    db.commit()

    return AuthResult(
        user=user,
        tenant=tenant,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
