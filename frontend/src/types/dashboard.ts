export interface DashboardKpis {
  revenue_today: string;
  revenue_month: string;
  expenses_month: string;
  appointments_today: number;
  completed_appointments_month: number;
  average_ticket: string;
  total_customers: number;
}

export interface DashboardAlerts {
  low_stock_products: number;
  pending_appointments: number;
  starting_soon: number;
  inactive_services: number;
}

export interface UpcomingAppointmentItem {
  id: string;
  starts_at: string;
  customer_name: string;
  service_name: string;
  employee_name: string;
  status: string;
}

export interface MoneyPoint {
  label: string;
  value: string;
}

export interface CountPoint {
  label: string;
  value: number;
}

export interface DashboardSummary {
  kpis: DashboardKpis;
  alerts: DashboardAlerts;
  upcoming_appointments: UpcomingAppointmentItem[];
  revenue_by_day: MoneyPoint[];
  revenue_by_month: MoneyPoint[];
  top_services: CountPoint[];
  top_professionals: CountPoint[];
  payment_method_breakdown: MoneyPoint[];
  customer_growth: CountPoint[];
}
