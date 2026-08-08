export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface AppointmentCustomerSummary {
  id: string;
  full_name: string;
  phone: string;
}

export interface AppointmentEmployeeSummary {
  id: string;
  full_name: string;
  role_title: string | null;
}

export interface AppointmentServiceSummary {
  id: string;
  name: string;
  price: string;
  duration_minutes: number;
}

export interface Appointment {
  id: string;
  customer: AppointmentCustomerSummary;
  employee: AppointmentEmployeeSummary;
  service: AppointmentServiceSummary;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  price: string;
  payment_method: string | null;
  status: AppointmentStatus;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface AppointmentPayload {
  customer_id: string;
  employee_id: string;
  service_id: string;
  starts_at: string;
  notes?: string | null;
}

export interface ReschedulePayload {
  starts_at: string;
  employee_id?: string;
}

export interface ProductSaleItem {
  product_id: string;
  quantity: number;
}

export interface CompletePayload {
  price?: string;
  payment_method_code: string;
  products_sold?: ProductSaleItem[];
}
