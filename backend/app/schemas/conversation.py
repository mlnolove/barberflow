import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.message import SenderType


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_type: SenderType
    body: str
    created_at: datetime
    read_at: datetime | None


class ConversationClientSummary(BaseModel):
    id: uuid.UUID
    full_name: str
    avatar_url: str | None


class ConversationRead(BaseModel):
    id: uuid.UUID
    client: ConversationClientSummary
    last_message_at: datetime | None
    created_at: datetime


class ConversationBarbershopSummary(BaseModel):
    id: uuid.UUID
    name: str
    logo_url: str | None


class ClientConversationCreate(BaseModel):
    tenant_id: uuid.UUID


class ClientConversationRead(BaseModel):
    id: uuid.UUID
    barbershop: ConversationBarbershopSummary
    last_message_at: datetime | None
    created_at: datetime
