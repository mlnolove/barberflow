export interface BusinessHours {
  id: string;
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
}

export interface BusinessHoursUpdatePayload {
  is_open: boolean;
  open_time?: string | null;
  close_time?: string | null;
  break_start_time?: string | null;
  break_end_time?: string | null;
}

export interface BlockedDate {
  id: string;
  date: string;
  reason: string | null;
}

export interface BlockedDateCreatePayload {
  date: string;
  reason?: string | null;
}

export interface TenantUpdatePayload {
  name?: string;
  logo_url?: string | null;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  primary_color?: string;
  secondary_color?: string;
  appointment_buffer_minutes?: number;
  min_advance_minutes?: number;
  max_advance_days?: number;
  allow_cancellation?: boolean;
  scheduling_mode?: "TIME_SLOT" | "QUEUE";
  auto_approve_appointments?: boolean;
  cancellation_deadline_minutes?: number | null;
}
