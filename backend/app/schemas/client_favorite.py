import uuid
from datetime import datetime

from pydantic import BaseModel


class ClientFavoriteCreate(BaseModel):
    tenant_id: uuid.UUID


class ClientFavoriteRead(BaseModel):
    tenant_id: uuid.UUID
    name: str
    logo_url: str | None
    city: str | None
    created_at: datetime
