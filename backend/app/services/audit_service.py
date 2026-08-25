import uuid

from sqlalchemy.orm import Session

from app.models.audit_log import AuditActorType, AuditLog
from app.repositories.audit_log_repository import AuditLogRepository


def log_user_action(
    db: Session,
    *,
    tenant_id: uuid.UUID,
    user_id: uuid.UUID,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> None:
    """Não comita — participa da mesma transação da operação que está
    sendo auditada, para que o registro de auditoria nunca exista sem a
    ação que ele descreve (nem vice-versa)."""
    AuditLogRepository(db).add(
        AuditLog(
            tenant_id=tenant_id,
            actor_type=AuditActorType.USER,
            actor_user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata,
        )
    )


def log_client_action(
    db: Session,
    *,
    tenant_id: uuid.UUID | None,
    client_account_id: uuid.UUID,
    action: str,
    resource_type: str,
    resource_id: uuid.UUID | None = None,
    metadata: dict | None = None,
) -> None:
    AuditLogRepository(db).add(
        AuditLog(
            tenant_id=tenant_id,
            actor_type=AuditActorType.CLIENT,
            actor_client_id=client_account_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata_json=metadata,
        )
    )
