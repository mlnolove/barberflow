import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import (
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidOrExpiredTokenError,
)
from app.core.security import (
    create_client_access_token,
    create_client_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.client_account import ClientAccount
from app.models.client_refresh_token import ClientRefreshToken
from app.repositories.client_account_repository import ClientAccountRepository
from app.repositories.client_refresh_token_repository import ClientRefreshTokenRepository
from app.schemas.client_auth import ClientLoginRequest, ClientSignupRequest


class ClientAuthResult:
    def __init__(
        self, client: ClientAccount, access_token: str, refresh_token: str, expires_in: int
    ):
        self.client = client
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.expires_in = expires_in


def signup(db: Session, payload: ClientSignupRequest) -> ClientAuthResult:
    repo = ClientAccountRepository(db)
    if repo.get_by_email(payload.email) is not None:
        raise EmailAlreadyExistsError()

    client = repo.add(
        ClientAccount(
            full_name=payload.full_name,
            email=payload.email,
            hashed_password=hash_password(payload.password),
            phone=payload.phone,
        )
    )
    return _issue_tokens(db, client)


def login(db: Session, payload: ClientLoginRequest) -> ClientAuthResult:
    client = ClientAccountRepository(db).get_by_email(payload.email)
    if client is None or not client.is_active:
        raise InvalidCredentialsError()
    if not verify_password(payload.password, client.hashed_password):
        raise InvalidCredentialsError()
    return _issue_tokens(db, client)


def refresh_access_token(db: Session, refresh_token: str) -> ClientAuthResult:
    try:
        payload = decode_token(refresh_token)
    except Exception as exc:
        raise InvalidOrExpiredTokenError() from exc

    if payload.get("type") != "client_refresh":
        raise InvalidOrExpiredTokenError()

    token_repo = ClientRefreshTokenRepository(db)
    stored = token_repo.get_by_jti(payload["jti"])
    if stored is None or stored.revoked:
        raise InvalidOrExpiredTokenError()
    if stored.expires_at < datetime.now(UTC):
        raise InvalidOrExpiredTokenError()

    try:
        client_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise InvalidOrExpiredTokenError() from exc

    client = ClientAccountRepository(db).get_by_id(client_id)
    if client is None or not client.is_active:
        raise InvalidOrExpiredTokenError()

    token_repo.revoke(stored)
    return _issue_tokens(db, client)


def logout(db: Session, refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token)
    except Exception:
        return
    token_repo = ClientRefreshTokenRepository(db)
    stored = token_repo.get_by_jti(payload.get("jti", ""))
    if stored is not None:
        token_repo.revoke(stored)


def _issue_tokens(db: Session, client: ClientAccount) -> ClientAuthResult:
    from app.core.config import settings

    access_token = create_client_access_token(client_id=str(client.id))
    refresh_token, jti, expires_at = create_client_refresh_token(client_id=str(client.id))

    token_repo = ClientRefreshTokenRepository(db)
    token_repo.add(ClientRefreshToken(client_account_id=client.id, jti=jti, expires_at=expires_at))
    db.commit()

    return ClientAuthResult(
        client=client,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
