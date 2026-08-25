import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.conversation import Conversation
from app.models.message import Message, SenderType
from app.models.notification import NotificationType
from app.repositories.conversation_repository import ConversationRepository
from app.repositories.message_repository import MessageRepository
from app.schemas.conversation import MessageCreate
from app.services import notification_service


def list_conversations(db: Session, tenant_id: uuid.UUID) -> list[Conversation]:
    return ConversationRepository(db, tenant_id).list_all()


def get_conversation(db: Session, tenant_id: uuid.UUID, conversation_id: uuid.UUID) -> Conversation:
    conversation = ConversationRepository(db, tenant_id).get_by_id(conversation_id)
    if conversation is None:
        raise NotFoundError("Conversa não encontrada.")
    return conversation


def list_messages(db: Session, tenant_id: uuid.UUID, conversation_id: uuid.UUID) -> list[Message]:
    get_conversation(db, tenant_id, conversation_id)
    return MessageRepository(db, conversation_id).list_all()


def send_message(
    db: Session,
    tenant_id: uuid.UUID,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: MessageCreate,
) -> Message:
    conversation = get_conversation(db, tenant_id, conversation_id)
    message = MessageRepository(db, conversation_id).add(
        Message(sender_type=SenderType.STAFF, sender_user_id=user_id, body=payload.body)
    )
    conversation.last_message_at = datetime.now(UTC)
    notification_service.notify_client(
        db,
        tenant_id=tenant_id,
        client_account_id=conversation.client_account_id,
        type_=NotificationType.NEW_MESSAGE,
        title="Nova mensagem",
        body=payload.body,
        metadata={"conversation_id": str(conversation_id)},
    )
    db.commit()
    return message


def mark_read(db: Session, tenant_id: uuid.UUID, conversation_id: uuid.UUID) -> None:
    get_conversation(db, tenant_id, conversation_id)
    MessageRepository(db, conversation_id).mark_all_read(except_sender_type=SenderType.STAFF)
    db.commit()
