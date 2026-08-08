from datetime import date as date_
from datetime import time

from sqlalchemy import Date, SmallInteger, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, UUIDPKMixin


class BusinessHours(UUIDPKMixin, TenantScopedMixin, Base):
    """Horário de funcionamento da barbearia por dia da semana.

    `weekday` segue a convenção 0=segunda ... 6=domingo (mesma de
    `Employee.work_days`). Uma linha por dia da semana por tenant.
    """

    __tablename__ = "business_hours"
    __table_args__ = (
        UniqueConstraint("tenant_id", "weekday", name="uq_business_hours_tenant_weekday"),
    )

    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_open: Mapped[bool] = mapped_column(default=True, nullable=False)
    open_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    close_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    break_start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    break_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)


class BlockedDate(UUIDPKMixin, TenantScopedMixin, Base):
    """Data específica em que a barbearia não funciona (feriado etc.)."""

    __tablename__ = "blocked_dates"
    __table_args__ = (UniqueConstraint("tenant_id", "date", name="uq_blocked_date_tenant_date"),)

    date: Mapped[date_] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
