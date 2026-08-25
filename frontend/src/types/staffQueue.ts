export type QueueStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface QueueCustomerSummary {
  id: string;
  full_name: string;
  phone: string | null;
}

export interface QueueEmployeeSummary {
  id: string;
  full_name: string;
  role_title: string | null;
}

export interface QueueServiceSummary {
  id: string;
  name: string;
  price: string;
  duration_minutes: number;
}

export interface StaffQueueEntry {
  id: string;
  customer: QueueCustomerSummary;
  employee: QueueEmployeeSummary | null;
  service: QueueServiceSummary;
  status: QueueStatus;
  position: number | null;
  joined_at: string;
  called_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  cancellation_reason: string | null;
}

export interface QueueEntryCreatePayload {
  customer_id: string;
  service_id: string;
  employee_id?: string | null;
}

export interface QueueCompletePayload {
  payment_method_code: string;
  price?: string | null;
}
