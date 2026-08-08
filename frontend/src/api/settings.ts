import { api } from "@/lib/api";
import type { Tenant } from "@/types/auth";
import type {
  BlockedDate,
  BlockedDateCreatePayload,
  BusinessHours,
  BusinessHoursUpdatePayload,
  TenantUpdatePayload,
} from "@/types/settings";

export async function getTenantSettings(): Promise<Tenant> {
  const { data } = await api.get<Tenant>("/settings/tenant");
  return data;
}

export async function updateTenantSettings(payload: TenantUpdatePayload): Promise<Tenant> {
  const { data } = await api.patch<Tenant>("/settings/tenant", payload);
  return data;
}

export async function listBusinessHours(): Promise<BusinessHours[]> {
  const { data } = await api.get<BusinessHours[]>("/settings/business-hours");
  return data;
}

export async function updateBusinessHours(
  weekday: number,
  payload: BusinessHoursUpdatePayload,
): Promise<BusinessHours> {
  const { data } = await api.patch<BusinessHours>(`/settings/business-hours/${weekday}`, payload);
  return data;
}

export async function listBlockedDates(): Promise<BlockedDate[]> {
  const { data } = await api.get<BlockedDate[]>("/settings/blocked-dates");
  return data;
}

export async function createBlockedDate(payload: BlockedDateCreatePayload): Promise<BlockedDate> {
  const { data } = await api.post<BlockedDate>("/settings/blocked-dates", payload);
  return data;
}

export async function deleteBlockedDate(id: string): Promise<void> {
  await api.delete(`/settings/blocked-dates/${id}`);
}
