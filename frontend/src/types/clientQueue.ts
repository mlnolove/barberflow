import type { EmployeeSummary, ServiceSummary } from "@/types/clientBarbershop";

export type QueueStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface QueueEntry {
  id: string;
  barbershop: { id: string; name: string; logo_url: string | null };
  employee: EmployeeSummary | null;
  service: ServiceSummary;
  status: QueueStatus;
  position: number | null;
  joined_at: string;
  called_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  cancellation_reason: string | null;
}
