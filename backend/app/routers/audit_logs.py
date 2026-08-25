from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.repositories.audit_log_repository import AuditLogRepository
from app.schemas.audit_log import AuditLogRead
from app.schemas.common import Page

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("", response_model=Page[AuditLogRead])
def list_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    current_user: CurrentUser = Depends(require_permission("audit.view")),
    db: Session = Depends(get_db),
):
    items, total = AuditLogRepository(db).list_for_tenant(
        current_user.tenant_id, page=page, limit=limit
    )
    return Page(items=items, total=total, page=page, limit=limit)
