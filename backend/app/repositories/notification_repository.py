import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationRecipientType


class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, notification: Notification) -> Notification:
        self.db.add(notification)
        self.db.flush()
        return notification

    def get_by_id(self, notification_id: uuid.UUID) -> Notification | None:
        return self.db.get(Notification, notification_id)

    def list_for_user(
        self, user_id: uuid.UUID, *, page: int = 1, limit: int = 20
    ) -> tuple[list[Notification], int]:
        stmt = select(Notification).where(
            Notification.recipient_type == NotificationRecipientType.USER,
            Notification.recipient_user_id == user_id,
        )
        return self._paginate(stmt, page, limit)

    def list_for_client(
        self, client_account_id: uuid.UUID, *, page: int = 1, limit: int = 20
    ) -> tuple[list[Notification], int]:
        stmt = select(Notification).where(
            Notification.recipient_type == NotificationRecipientType.CLIENT,
            Notification.recipient_client_id == client_account_id,
        )
        return self._paginate(stmt, page, limit)

    def _paginate(self, stmt, page: int, limit: int) -> tuple[list[Notification], int]:
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        stmt = stmt.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total

    def mark_all_read_for_user(self, user_id: uuid.UUID) -> None:
        stmt = select(Notification).where(
            Notification.recipient_type == NotificationRecipientType.USER,
            Notification.recipient_user_id == user_id,
            Notification.read_at.is_(None),
        )
        for notification in self.db.execute(stmt).scalars().all():
            notification.read_at = datetime.now(UTC)
        self.db.flush()

    def mark_all_read_for_client(self, client_account_id: uuid.UUID) -> None:
        stmt = select(Notification).where(
            Notification.recipient_type == NotificationRecipientType.CLIENT,
            Notification.recipient_client_id == client_account_id,
            Notification.read_at.is_(None),
        )
        for notification in self.db.execute(stmt).scalars().all():
            notification.read_at = datetime.now(UTC)
        self.db.flush()
