import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError
from app.models.conversation import Conversation
from app.models.message import Message, SenderType
from app.models.notification import NotificationType
from app.repositories.client_conversation_repository import ClientConversationRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.tenant_repository import TenantRepository
from app.repositories.user_repository import find_tenant_owner
from app.schemas.conversation import MessageCreate
from app.services import notification_service


def get_or_create_conversation(
    db: Session, client_account_id: uuid.UUID, tenant_id: uuid.UUID
) -> Conversation:
    tenant = TenantRepository(db).get_by_id(tenant_id)
    if tenant is None or not tenant.is_active:
        raise NotFoundError("Barbearia não encontrada.")

    repo = ClientConversationRepository(db, client_account_id)
    existing = repo.get_by_tenant(tenant_id)
    if existing is not None:
        return existing

    conversation = Conversation(tenant_id=tenant_id, client_account_id=client_account_id)
    conversation = repo.add(conversation)
    db.commit()
    return conversation


def list_my_conversations(db: Session, client_account_id: uuid.UUID) -> list[Conversation]:
    return ClientConversationRepository(db, client_account_id).list_all()


def get_my_conversation(
    db: Session, client_account_id: uuid.UUID, conversation_id: uuid.UUID
) -> Conversation:
    conversation = ClientConversationRepository(db, client_account_id).get_by_id(conversation_id)
    if conversation is None:
        raise NotFoundError("Conversa não encontrada.")
    return conversation


def list_messages(
    db: Session, client_account_id: uuid.UUID, conversation_id: uuid.UUID
) -> list[Message]:
    get_my_conversation(db, client_account_id, conversation_id)
    return MessageRepository(db, conversation_id).list_all()


def send_message(
    db: Session, client_account_id: uuid.UUID, conversation_id: uuid.UUID, payload: MessageCreate
) -> Message:
    conversation = get_my_conversation(db, client_account_id, conversation_id)
    message = MessageRepository(db, conversation_id).add(
        Message(
            sender_type=SenderType.CLIENT, sender_client_id=client_account_id, body=payload.body
        )
    )
    conversation.last_message_at = datetime.now(UTC)

    owner = find_tenant_owner(db, conversation.tenant_id)
    if owner is not None:
        notification_service.notify_user(
            db,
            tenant_id=conversation.tenant_id,
            user_id=owner.id,
            type_=NotificationType.NEW_MESSAGE,
            title="Nova mensagem de cliente",
            body=payload.body,
            metadata={"conversation_id": str(conversation_id)},
        )

    db.commit()
    return message
