import type { EmployeeSummary, ServiceSummary } from "@/types/clientBarbershop";

export type ClientAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface BarbershopSummary {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface ClientAppointment {
  id: string;
  barbershop: BarbershopSummary;
  employee: EmployeeSummary;
  service: ServiceSummary;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  price: string;
  status: ClientAppointmentStatus;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
}
