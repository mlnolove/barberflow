import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"
    CLIENT_ACCESS = "client_access"
    CLIENT_REFRESH = "client_refresh"


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(
    *,
    subject: str,
    token_type: TokenType,
    expires_delta: timedelta,
    tenant_id: str | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    now = datetime.now(UTC)
    expire = now + expires_delta
    jti = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type.value,
        "jti": jti,
        "iat": now,
        "exp": expire,
    }
    if tenant_id is not None:
        payload["tenant_id"] = tenant_id
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expire


def create_access_token(*, user_id: str, tenant_id: str) -> str:
    token, _, _ = _create_token(
        subject=user_id,
        tenant_id=tenant_id,
        token_type=TokenType.ACCESS,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return token


def create_refresh_token(*, user_id: str, tenant_id: str) -> tuple[str, str, datetime]:
    return _create_token(
        subject=user_id,
        tenant_id=tenant_id,
        token_type=TokenType.REFRESH,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def create_client_access_token(*, client_id: str) -> str:
    """Token de acesso do domínio de CLIENTE — sem `tenant_id`, pois um
    cliente não pertence a uma barbearia específica (pode agendar em
    várias). O `type` (`client_access`) já basta para impedir que esse
    token seja aceito em qualquer endpoint de equipe/staff."""
    token, _, _ = _create_token(
        subject=client_id,
        token_type=TokenType.CLIENT_ACCESS,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return token


def create_client_refresh_token(*, client_id: str) -> tuple[str, str, datetime]:
    return _create_token(
        subject=client_id,
        token_type=TokenType.CLIENT_REFRESH,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def generate_raw_token() -> str:
    """Token de uso único de alta entropia (ex.: reset de senha). Não é uma
    senha de usuário, então não usa Argon2 — o hash abaixo só protege o
    banco caso vaze, a segurança real vem da entropia do `secrets.token_urlsafe`."""
    return secrets.token_urlsafe(32)


def hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
