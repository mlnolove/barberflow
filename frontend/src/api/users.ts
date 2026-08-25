import { api } from "@/lib/api";
import type { StaffUser, StaffUserCreatePayload, StaffUserUpdatePayload } from "@/types/user";

export async function listStaffUsers(): Promise<StaffUser[]> {
  const { data } = await api.get<StaffUser[]>("/users");
  return data;
}

export async function createStaffUser(payload: StaffUserCreatePayload): Promise<StaffUser> {
  const { data } = await api.post<StaffUser>("/users", payload);
  return data;
}

export async function updateStaffUser(id: string, payload: StaffUserUpdatePayload): Promise<StaffUser> {
  const { data } = await api.patch<StaffUser>(`/users/${id}`, payload);
  return data;
}

export async function setStaffUserPermission(
  id: string,
  permissionCode: string,
  granted: boolean,
): Promise<StaffUser> {
  const { data } = await api.put<StaffUser>(`/users/${id}/permissions`, {
    permission_code: permissionCode,
    granted,
  });
  return data;
}
