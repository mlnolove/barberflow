import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.core.realtime import broadcaster
from app.core.security import decode_token
from app.db.session import get_db
from app.models.conversation import Conversation
from app.schemas.conversation import (
    ConversationClientSummary,
    ConversationRead,
    MessageCreate,
    MessageRead,
)
from app.services import conversation_service

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def _to_read(conversation: Conversation) -> ConversationRead:
    return ConversationRead(
        id=conversation.id,
        client=ConversationClientSummary(
            id=conversation.client_account.id,
            full_name=conversation.client_account.full_name,
            avatar_url=conversation.client_account.avatar_url,
        ),
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
    )


@router.get("", response_model=list[ConversationRead])
def list_conversations(
    current_user: CurrentUser = Depends(require_permission("messages.view")),
    db: Session = Depends(get_db),
):
    conversations = conversation_service.list_conversations(db, current_user.tenant_id)
    return [_to_read(c) for c in conversations]


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
def list_messages(
    conversation_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("messages.view")),
    db: Session = Depends(get_db),
):
    return conversation_service.list_messages(db, current_user.tenant_id, conversation_id)


@router.post("/{conversation_id}/messages", response_model=MessageRead, status_code=201)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    current_user: CurrentUser = Depends(require_permission("messages.reply")),
    db: Session = Depends(get_db),
):
    message = conversation_service.send_message(
        db, current_user.tenant_id, conversation_id, current_user.user.id, payload
    )
    await broadcaster.broadcast(
        conversation_id, MessageRead.model_validate(message).model_dump(mode="json")
    )
    return message


@router.post("/{conversation_id}/read", status_code=204)
def mark_read(
    conversation_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("messages.view")),
    db: Session = Depends(get_db),
):
    conversation_service.mark_read(db, current_user.tenant_id, conversation_id)


@router.websocket("/{conversation_id}/ws")
async def conversation_ws(
    websocket: WebSocket, conversation_id: uuid.UUID, db: Session = Depends(get_db)
):
    """Autenticação via `?token=` na query string — WebSocket do navegador
    não permite cabeçalhos customizados no handshake, então o Bearer token
    de acesso (o mesmo emitido no login) é aceito também dessa forma aqui."""
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("tipo de token inválido")
        tenant_id = uuid.UUID(payload["tenant_id"])
    except Exception:
        await websocket.close(code=4401)
        return

    try:
        conversation_service.get_conversation(db, tenant_id, conversation_id)
    except Exception:
        await websocket.close(code=4404)
        return

    await broadcaster.connect(conversation_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # conexão mantida viva; envio é via POST /messages
    except WebSocketDisconnect:
        pass
    finally:
        await broadcaster.disconnect(conversation_id, websocket)
