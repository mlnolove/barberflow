import type { ServiceSummary } from "@/types/service";

export interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  role_title: string | null;
  specialties: string[];
  commission_percentage: string;
  work_start_time: string | null;
  work_end_time: string | null;
  work_days: number[];
  is_active: boolean;
  created_at: string;
  services: ServiceSummary[];
}

export interface EmployeePayload {
  full_name: string;
  phone: string;
  email?: string | null;
  role_title?: string | null;
  specialties?: string[];
  commission_percentage?: string;
  work_start_time?: string | null;
  work_end_time?: string | null;
  work_days?: number[];
  service_ids?: string[];
}
