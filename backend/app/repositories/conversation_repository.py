import uuid

from sqlalchemy.orm import joinedload

from app.models.conversation import Conversation
from app.repositories.base import TenantScopedRepository


class ConversationRepository(TenantScopedRepository[Conversation]):
    model = Conversation

    def _with_client(self, stmt):
        return stmt.options(joinedload(Conversation.client_account))

    def get_by_id(self, entity_id: uuid.UUID) -> Conversation | None:
        stmt = self._with_client(self._scoped()).where(Conversation.id == entity_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def get_by_client(self, client_account_id: uuid.UUID) -> Conversation | None:
        stmt = self._scoped().where(Conversation.client_account_id == client_account_id)
        return self.db.execute(stmt).scalar_one_or_none()

    def list_all(self) -> list[Conversation]:
        stmt = self._with_client(self._scoped()).order_by(
            Conversation.last_message_at.desc().nulls_last()
        )
        return list(self.db.execute(stmt).unique().scalars().all())
