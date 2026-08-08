import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.appointment import AppointmentStatus


class DashboardKpis(BaseModel):
    revenue_today: Decimal
    revenue_month: Decimal
    expenses_month: Decimal
    appointments_today: int
    completed_appointments_month: int
    average_ticket: Decimal
    total_customers: int


class DashboardAlerts(BaseModel):
    low_stock_products: int
    pending_appointments: int
    starting_soon: int
    inactive_services: int


class UpcomingAppointmentItem(BaseModel):
    id: uuid.UUID
    starts_at: datetime
    customer_name: str
    service_name: str
    employee_name: str
    status: AppointmentStatus


class MoneyPoint(BaseModel):
    label: str
    value: Decimal


class CountPoint(BaseModel):
    label: str
    value: int


class DashboardSummary(BaseModel):
    kpis: DashboardKpis
    alerts: DashboardAlerts
    upcoming_appointments: list[UpcomingAppointmentItem]
    revenue_by_day: list[MoneyPoint]
    revenue_by_month: list[MoneyPoint]
    top_services: list[CountPoint]
    top_professionals: list[CountPoint]
    payment_method_breakdown: list[MoneyPoint]
    customer_growth: list[CountPoint]
