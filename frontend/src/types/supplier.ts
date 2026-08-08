export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SupplierSummary {
  id: string;
  name: string;
}

export interface SupplierPayload {
  name: string;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}
