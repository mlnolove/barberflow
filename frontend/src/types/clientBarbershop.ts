export interface BarbershopCard {
  id: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  distance_km: number | null;
  min_price: string | null;
  max_price: string | null;
  is_open_now: boolean | null;
}

export interface BarbershopSearchResponse {
  items: BarbershopCard[];
  total: number;
  page: number;
  limit: number;
}

export interface BusinessHoursRead {
  id: string;
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
}

export interface ServiceSummary {
  id: string;
  name: string;
  price: string;
  duration_minutes: number;
}

export interface ServiceRead extends ServiceSummary {
  description: string | null;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeSummary {
  id: string;
  full_name: string;
  role_title: string | null;
}

export interface TenantPhotoRead {
  id: string;
  url: string;
  position: number;
}

export type SchedulingMode = "TIME_SLOT" | "QUEUE";

export interface BarbershopDetail {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
  logo_url: string | null;
  scheduling_mode: SchedulingMode;
  photos: TenantPhotoRead[];
  services: ServiceRead[];
  barbers: EmployeeSummary[];
  business_hours: BusinessHoursRead[];
}

export interface AvailabilitySlot {
  starts_at: string;
  ends_at: string;
}

export interface AvailabilityResponse {
  date: string;
  employee_id: string;
  service_id: string;
  slots: AvailabilitySlot[];
}
