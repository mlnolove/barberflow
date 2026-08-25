import uuid

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.core.deps import CurrentClientDep
from app.core.realtime import broadcaster
from app.core.security import decode_token
from app.db.session import get_db
from app.models.conversation import Conversation
from app.repositories.tenant_repository import TenantRepository
from app.schemas.conversation import (
    ClientConversationCreate,
    ClientConversationRead,
    ConversationBarbershopSummary,
    MessageCreate,
    MessageRead,
)
from app.services import client_conversation_service

router = APIRouter(prefix="/api/client/conversations", tags=["client-conversations"])


def _to_read(db: Session, conversation: Conversation) -> ClientConversationRead:
    tenant = TenantRepository(db).get_by_id(conversation.tenant_id)
    return ClientConversationRead(
        id=conversation.id,
        barbershop=ConversationBarbershopSummary(
            id=tenant.id, name=tenant.name, logo_url=tenant.logo_url
        ),
        last_message_at=conversation.last_message_at,
        created_at=conversation.created_at,
    )


@router.get("", response_model=list[ClientConversationRead])
def list_my_conversations(current_client: CurrentClientDep, db: Session = Depends(get_db)):
    conversations = client_conversation_service.list_my_conversations(db, current_client.client.id)
    return [_to_read(db, c) for c in conversations]


@router.post("", response_model=ClientConversationRead, status_code=201)
def start_conversation(
    payload: ClientConversationCreate,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    conversation = client_conversation_service.get_or_create_conversation(
        db, current_client.client.id, payload.tenant_id
    )
    return _to_read(db, conversation)


@router.get("/{conversation_id}/messages", response_model=list[MessageRead])
def list_messages(
    conversation_id: uuid.UUID, current_client: CurrentClientDep, db: Session = Depends(get_db)
):
    return client_conversation_service.list_messages(db, current_client.client.id, conversation_id)


@router.post("/{conversation_id}/messages", response_model=MessageRead, status_code=201)
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    current_client: CurrentClientDep,
    db: Session = Depends(get_db),
):
    message = client_conversation_service.send_message(
        db, current_client.client.id, conversation_id, payload
    )
    await broadcaster.broadcast(
        conversation_id, MessageRead.model_validate(message).model_dump(mode="json")
    )
    return message


@router.websocket("/{conversation_id}/ws")
async def conversation_ws(
    websocket: WebSocket, conversation_id: uuid.UUID, db: Session = Depends(get_db)
):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = decode_token(token)
        if payload.get("type") != "client_access":
            raise ValueError("tipo de token inválido")
        client_account_id = uuid.UUID(payload["sub"])
    except Exception:
        await websocket.close(code=4401)
        return

    try:
        client_conversation_service.get_my_conversation(db, client_account_id, conversation_id)
    except Exception:
        await websocket.close(code=4404)
        return

    await broadcaster.connect(conversation_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await broadcaster.disconnect(conversation_id, websocket)
