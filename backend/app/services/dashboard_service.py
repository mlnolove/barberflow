import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.orm import Session

from app.repositories.dashboard_repository import DashboardRepository
from app.schemas.dashboard import (
    CountPoint,
    DashboardAlerts,
    DashboardKpis,
    DashboardSummary,
    MoneyPoint,
    UpcomingAppointmentItem,
)
from app.services import financial_service

_MONTH_LABELS = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez",
]  # fmt: skip

_DAILY_CHART_DAYS = 14
_MONTHLY_CHART_MONTHS = 6
_RECENT_WINDOW_DAYS = 30
_TOP_N = 5


def _month_bounds(anchor: date, months_back: int) -> tuple[int, int]:
    total_months = anchor.year * 12 + (anchor.month - 1) - months_back
    return total_months // 12, total_months % 12 + 1


def _next_month_start(year: int, month: int) -> date:
    if month == 12:
        return date(year + 1, 1, 1)
    return date(year, month + 1, 1)


def get_summary(db: Session, tenant_id: uuid.UUID) -> DashboardSummary:
    repo = DashboardRepository(db, tenant_id)
    now = datetime.now(UTC)
    today = now.date()
    month_start = date(today.year, today.month, 1)
    next_month_start = _next_month_start(today.year, today.month)
    recent_start = now - timedelta(days=_RECENT_WINDOW_DAYS)

    today_summary = financial_service.get_summary(db, tenant_id, date_from=today, date_to=today)
    month_summary = financial_service.get_summary(
        db, tenant_id, date_from=month_start, date_to=today
    )

    kpis = DashboardKpis(
        revenue_today=today_summary.total_income,
        revenue_month=month_summary.total_income,
        expenses_month=month_summary.total_expense,
        appointments_today=repo.count_appointments_on_day(today),
        completed_appointments_month=repo.count_completed_in_range(
            datetime.combine(month_start, datetime.min.time(), tzinfo=UTC),
            datetime.combine(next_month_start, datetime.min.time(), tzinfo=UTC),
        ),
        average_ticket=round(
            repo.average_ticket(
                datetime.combine(month_start, datetime.min.time(), tzinfo=UTC),
                datetime.combine(next_month_start, datetime.min.time(), tzinfo=UTC),
            ),
            2,
        ),
        total_customers=repo.count_active_customers(),
    )

    alerts = DashboardAlerts(
        low_stock_products=repo.count_low_stock_products(),
        pending_appointments=repo.count_pending_appointments(after=now),
        starting_soon=repo.count_starting_between(now, now + timedelta(hours=2)),
        inactive_services=repo.count_inactive_services(),
    )

    upcoming = [
        UpcomingAppointmentItem(
            id=a.id,
            starts_at=a.starts_at,
            customer_name=a.customer.full_name,
            service_name=a.service.name,
            employee_name=a.employee.full_name,
            status=a.status,
        )
        for a in repo.upcoming_appointments(after=now, limit=_TOP_N)
    ]

    daily_start = today - timedelta(days=_DAILY_CHART_DAYS - 1)
    daily_totals = dict(repo.revenue_by_day(daily_start, today))
    revenue_by_day = [
        MoneyPoint(
            label=(daily_start + timedelta(days=i)).strftime("%d/%m"),
            value=daily_totals.get(daily_start + timedelta(days=i), 0),
        )
        for i in range(_DAILY_CHART_DAYS)
    ]

    monthly_start_year, monthly_start_month = _month_bounds(today, _MONTHLY_CHART_MONTHS - 1)
    monthly_start = date(monthly_start_year, monthly_start_month, 1)
    monthly_totals = {(y, m): total for y, m, total in repo.revenue_by_month(monthly_start, today)}
    revenue_by_month = []
    for i in range(_MONTHLY_CHART_MONTHS):
        y, m = _month_bounds(today, _MONTHLY_CHART_MONTHS - 1 - i)
        revenue_by_month.append(
            MoneyPoint(label=f"{_MONTH_LABELS[m - 1]}/{y}", value=monthly_totals.get((y, m), 0))
        )

    top_services = [
        CountPoint(label=name, value=count)
        for name, count in repo.top_services(recent_start, limit=_TOP_N)
    ]
    top_professionals = [
        CountPoint(label=name, value=count)
        for name, count in repo.top_professionals(recent_start, limit=_TOP_N)
    ]
    payment_breakdown = [
        MoneyPoint(label=name, value=total)
        for name, total in repo.payment_method_breakdown(recent_start.date(), today)
    ]

    growth_start = datetime.combine(monthly_start, datetime.min.time(), tzinfo=UTC)
    growth_totals = {(y, m): count for y, m, count in repo.customer_growth(growth_start, now)}
    customer_growth = []
    for i in range(_MONTHLY_CHART_MONTHS):
        y, m = _month_bounds(today, _MONTHLY_CHART_MONTHS - 1 - i)
        customer_growth.append(
            CountPoint(label=f"{_MONTH_LABELS[m - 1]}/{y}", value=growth_totals.get((y, m), 0))
        )

    return DashboardSummary(
        kpis=kpis,
        alerts=alerts,
        upcoming_appointments=upcoming,
        revenue_by_day=revenue_by_day,
        revenue_by_month=revenue_by_month,
        top_services=top_services,
        top_professionals=top_professionals,
        payment_method_breakdown=payment_breakdown,
        customer_growth=customer_growth,
    )
