from datetime import UTC, datetime, timedelta
from enum import StrEnum

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.email import send_password_reset_email
from app.core.exceptions import DomainError
from app.core.security import generate_raw_token, hash_password, hash_reset_token
from app.models.client_account import ClientAccount
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.repositories.client_account_repository import ClientAccountRepository
from app.repositories.client_refresh_token_repository import ClientRefreshTokenRepository
from app.repositories.refresh_token_repository import RefreshTokenRepository
from app.repositories.user_repository import find_user_by_email_global


class ResetRealm(StrEnum):
    STAFF = "staff"
    CLIENT = "client"


class InvalidResetTokenError(DomainError):
    def __init__(self):
        super().__init__("Link de redefinição de senha inválido ou expirado.")


def request_reset(db: Session, realm: ResetRealm, email: str) -> None:
    """Nunca revela se o e-mail existe (mesma resposta sempre) — evita
    enumeração de usuários (seção 13 da especificação)."""
    if realm is ResetRealm.STAFF:
        subject = find_user_by_email_global(db, email)
    else:
        subject = ClientAccountRepository(db).get_by_email(email)

    if subject is None or not subject.is_active:
        return

    raw_token = generate_raw_token()
    expire_minutes = settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    reset_token = PasswordResetToken(
        token_hash=hash_reset_token(raw_token),
        expires_at=datetime.now(UTC) + timedelta(minutes=expire_minutes),
    )
    if realm is ResetRealm.STAFF:
        reset_token.user_id = subject.id
    else:
        reset_token.client_account_id = subject.id

    db.add(reset_token)
    db.commit()

    reset_link = f"barberflow://reset-password?token={raw_token}&realm={realm.value}"
    send_password_reset_email(to=subject.email, full_name=subject.full_name, reset_link=reset_link)


def confirm_reset(db: Session, token: str, new_password: str) -> None:
    token_hash = hash_reset_token(token)
    stmt = select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    reset_token = db.execute(stmt).scalar_one_or_none()

    if reset_token is None or reset_token.used_at is not None:
        raise InvalidResetTokenError()
    if reset_token.expires_at < datetime.now(UTC):
        raise InvalidResetTokenError()

    reset_token.used_at = datetime.now(UTC)

    if reset_token.user_id is not None:
        user = db.get(User, reset_token.user_id)
        if user is None:
            raise InvalidResetTokenError()
        user.hashed_password = hash_password(new_password)
        RefreshTokenRepository(db).revoke_all_for_user(user.id)
    else:
        client = db.get(ClientAccount, reset_token.client_account_id)
        if client is None:
            raise InvalidResetTokenError()
        client.hashed_password = hash_password(new_password)
        ClientRefreshTokenRepository(db).revoke_all_for_client(client.id)

    db.commit()
