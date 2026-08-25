import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.conversation import Conversation


class ClientConversationRepository:
    """Conversas de UM cliente, possivelmente com várias barbearias — por
    isso exige `client_account_id` no construtor e filtra por ele em toda
    query, no mesmo espírito do `TenantScopedRepository`."""

    def __init__(self, db: Session, client_account_id: uuid.UUID):
        self.db = db
        self.client_account_id = client_account_id

    def _scoped(self):
        return select(Conversation).where(Conversation.client_account_id == self.client_account_id)

    def get_by_id(self, conversation_id: uuid.UUID) -> Conversation | None:
        stmt = self._scoped().where(Conversation.id == conversation_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_tenant(self, tenant_id: uuid.UUID) -> Conversation | None:
        stmt = self._scoped().where(Conversation.tenant_id == tenant_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[Conversation]:
        stmt = self._scoped().order_by(Conversation.last_message_at.desc().nulls_last())
        return list(self.db.execute(stmt).scalars().all())

    def add(self, conversation: Conversation) -> Conversation:
        conversation.client_account_id = self.client_account_id
        self.db.add(conversation)
        self.db.flush()
        return conversation
