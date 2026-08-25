import uuid

from sqlalchemy.orm import Session

from app.core.push import get_push_backend
from app.models.notification import Notification, NotificationRecipientType, NotificationType
from app.repositories.notification_repository import NotificationRepository


def notify_user(
    db: Session,
    *,
    tenant_id: uuid.UUID | None,
    user_id: uuid.UUID,
    type_: NotificationType,
    title: str,
    body: str,
    metadata: dict | None = None,
) -> Notification:
    """Não comita — participa da transação do evento que a originou (nova
    mensagem, mudança de status do agendamento etc.)."""
    notification = NotificationRepository(db).add(
        Notification(
            tenant_id=tenant_id,
            recipient_type=NotificationRecipientType.USER,
            recipient_user_id=user_id,
            type=type_,
            title=title,
            body=body,
            metadata_json=metadata,
        )
    )
    get_push_backend().send(title=title, body=body, data=metadata)
    return notification


def notify_client(
    db: Session,
    *,
    tenant_id: uuid.UUID | None,
    client_account_id: uuid.UUID,
    type_: NotificationType,
    title: str,
    body: str,
    metadata: dict | None = None,
) -> Notification:
    notification = NotificationRepository(db).add(
        Notification(
            tenant_id=tenant_id,
            recipient_type=NotificationRecipientType.CLIENT,
            recipient_client_id=client_account_id,
            type=type_,
            title=title,
            body=body,
            metadata_json=metadata,
        )
    )
    get_push_backend().send(title=title, body=body, data=metadata)
    return notification


def list_my_notifications(
    db: Session, user_id: uuid.UUID, *, page: int = 1, limit: int = 20
) -> tuple[list[Notification], int]:
    return NotificationRepository(db).list_for_user(user_id, page=page, limit=limit)


def list_my_client_notifications(
    db: Session, client_account_id: uuid.UUID, *, page: int = 1, limit: int = 20
) -> tuple[list[Notification], int]:
    return NotificationRepository(db).list_for_client(client_account_id, page=page, limit=limit)


def mark_all_read_for_user(db: Session, user_id: uuid.UUID) -> None:
    NotificationRepository(db).mark_all_read_for_user(user_id)
    db.commit()


def mark_all_read_for_client(db: Session, client_account_id: uuid.UUID) -> None:
    NotificationRepository(db).mark_all_read_for_client(client_account_id)
    db.commit()
