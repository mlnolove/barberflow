export interface Role {
  id: string;
  code: string;
  name: string;
}

export interface User {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  permissions: string[];
}

export type SchedulingMode = "TIME_SLOT" | "QUEUE";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  latitude: string | null;
  longitude: string | null;
  primary_color: string;
  secondary_color: string;
  onboarding_completed: boolean;
  appointment_buffer_minutes: number;
  min_advance_minutes: number;
  max_advance_days: number;
  allow_cancellation: boolean;
  scheduling_mode: SchedulingMode;
  auto_approve_appointments: boolean;
  cancellation_deadline_minutes: number | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
  tenant: Tenant;
}
