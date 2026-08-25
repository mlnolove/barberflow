import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client_refresh_token import ClientRefreshToken


class ClientRefreshTokenRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_jti(self, jti: str) -> ClientRefreshToken | None:
        stmt = select(ClientRefreshToken).where(ClientRefreshToken.jti == jti)
        return self.db.execute(stmt).scalar_one_or_none()

    def add(self, token: ClientRefreshToken) -> ClientRefreshToken:
        self.db.add(token)
        self.db.flush()
        return token

    def revoke(self, token: ClientRefreshToken) -> None:
        token.revoked = True
        self.db.flush()

    def revoke_all_for_client(self, client_account_id: uuid.UUID) -> None:
        stmt = select(ClientRefreshToken).where(
            ClientRefreshToken.client_account_id == client_account_id,
            ClientRefreshToken.revoked.is_(False),
        )
        for token in self.db.execute(stmt).scalars().all():
            token.revoked = True
        self.db.flush()
