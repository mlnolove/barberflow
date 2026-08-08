import { api } from "@/lib/api";
import type { Page } from "@/types/common";
import type { Service, ServicePayload } from "@/types/service";

export interface ServiceListParams {
  q?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export async function listServices(params: ServiceListParams): Promise<Page<Service>> {
  const { data } = await api.get<Page<Service>>("/services", { params });
  return data;
}

export async function getService(id: string): Promise<Service> {
  const { data } = await api.get<Service>(`/services/${id}`);
  return data;
}

export async function createService(payload: ServicePayload): Promise<Service> {
  const { data } = await api.post<Service>("/services", payload);
  return data;
}

export async function updateService(
  id: string,
  payload: Partial<ServicePayload>,
): Promise<Service> {
  const { data } = await api.patch<Service>(`/services/${id}`, payload);
  return data;
}

export async function deactivateService(id: string): Promise<Service> {
  const { data } = await api.post<Service>(`/services/${id}/deactivate`);
  return data;
}

export async function reactivateService(id: string): Promise<Service> {
  const { data } = await api.post<Service>(`/services/${id}/reactivate`);
  return data;
}
