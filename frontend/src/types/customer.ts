export interface Customer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  birth_date: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CustomerListParams {
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface CustomerPayload {
  full_name: string;
  phone: string;
  email?: string | null;
  birth_date?: string | null;
  address?: string | null;
  notes?: string | null;
}
