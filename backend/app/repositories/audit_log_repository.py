import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


class AuditLogRepository:
    """Append-only por natureza — não existe `update`/`delete` aqui de
    propósito (seção 13: trilha de auditoria imutável)."""

    def __init__(self, db: Session):
        self.db = db

    def add(self, entry: AuditLog) -> AuditLog:
        self.db.add(entry)
        self.db.flush()
        return entry

    def list_for_tenant(
        self, tenant_id: uuid.UUID, *, page: int = 1, limit: int = 50
    ) -> tuple[list[AuditLog], int]:
        stmt = select(AuditLog).where(AuditLog.tenant_id == tenant_id)
        total = self.db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        stmt = stmt.order_by(AuditLog.created_at.desc()).offset((page - 1) * limit).limit(limit)
        items = list(self.db.execute(stmt).scalars().all())
        return items, total
