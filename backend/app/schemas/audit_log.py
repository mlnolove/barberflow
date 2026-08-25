import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.audit_log import AuditActorType


class AuditLogRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    actor_type: AuditActorType
    actor_user_id: uuid.UUID | None
    actor_client_id: uuid.UUID | None
    action: str
    resource_type: str
    resource_id: uuid.UUID | None
    metadata_json: dict | None
    created_at: datetime
