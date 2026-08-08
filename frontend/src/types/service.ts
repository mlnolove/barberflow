export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: string;
  duration_minutes: number;
  category: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  price: string;
  duration_minutes: number;
}

export interface ServicePayload {
  name: string;
  description?: string | null;
  price: string;
  duration_minutes: number;
  category?: string | null;
}
