from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentClientDep
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.notification import NotificationRead
from app.services import notification_service

router = APIRouter(prefix="/api/client/notifications", tags=["client-notifications"])


@router.get("", response_model=Page[NotificationRead])
def list_notifications(
    current_client: CurrentClientDep,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    items, total = notification_service.list_my_client_notifications(
        db, current_client.client.id, page=page, limit=limit
    )
    return Page(items=items, total=total, page=page, limit=limit)


@router.post("/read-all", status_code=204)
def mark_all_read(current_client: CurrentClientDep, db: Session = Depends(get_db)):
    notification_service.mark_all_read_for_client(db, current_client.client.id)
