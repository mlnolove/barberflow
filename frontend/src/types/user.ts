export interface Role {
  id: string;
  code: string;
  name: string;
}

export interface StaffUser {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: Role;
  is_active: boolean;
  permissions: string[];
}

export interface StaffUserCreatePayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string | null;
  role_code: string;
}

export interface StaffUserUpdatePayload {
  full_name?: string;
  phone?: string | null;
  role_code?: string;
  is_active?: boolean;
}
