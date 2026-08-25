import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.message import Message


class MessageRepository:
    """Mensagens de UMA conversa — quem chama já validou que o autor
    (cliente ou membro da equipe) tem acesso a essa conversa antes de
    instanciar este repositório."""

    def __init__(self, db: Session, conversation_id: uuid.UUID):
        self.db = db
        self.conversation_id = conversation_id

    def _scoped(self):
        return select(Message).where(Message.conversation_id == self.conversation_id)

    def list_all(self) -> list[Message]:
        stmt = self._scoped().order_by(Message.created_at)
        return list(self.db.execute(stmt).scalars().all())

    def add(self, message: Message) -> Message:
        message.conversation_id = self.conversation_id
        self.db.add(message)
        self.db.flush()
        return message

    def mark_all_read(self, *, except_sender_type) -> None:
        stmt = self._scoped().where(
            Message.sender_type != except_sender_type, Message.read_at.is_(None)
        )
        for message in self.db.execute(stmt).scalars().all():
            message.read_at = datetime.now(UTC)
        self.db.flush()
