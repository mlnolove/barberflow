import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.client_account import ClientAccount


class ClientAccountRepository:
    """`ClientAccount` não é tenant-scoped (é a raiz do domínio de auth de
    cliente, análogo a `TenantRepository` para o domínio de tenant/staff)."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, client_account_id: uuid.UUID) -> ClientAccount | None:
        return self.db.get(ClientAccount, client_account_id)

    def get_by_email(self, email: str) -> ClientAccount | None:
        stmt = select(ClientAccount).where(ClientAccount.email == email)
        return self.db.execute(stmt).scalar_one_or_none()

    def add(self, client_account: ClientAccount) -> ClientAccount:
        self.db.add(client_account)
        self.db.flush()
        return client_account
