from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.schemas.dashboard import DashboardSummary
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
def get_dashboard(
    current_user: CurrentUser = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    return dashboard_service.get_summary(db, current_user.tenant_id)
