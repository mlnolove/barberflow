import { clientApi } from "@/lib/clientApi";
import type {
  AvailabilityResponse,
  BarbershopDetail,
  BarbershopSearchResponse,
  EmployeeSummary,
} from "@/types/clientBarbershop";

export interface SearchBarbershopsParams {
  q?: string;
  latitude?: number;
  longitude?: number;
  radius_km?: number;
  page?: number;
  limit?: number;
}

export async function searchBarbershops(
  params: SearchBarbershopsParams,
): Promise<BarbershopSearchResponse> {
  const { data } = await clientApi.get<BarbershopSearchResponse>("/barbershops", { params });
  return data;
}

export async function getBarbershop(tenantId: string): Promise<BarbershopDetail> {
  const { data } = await clientApi.get<BarbershopDetail>(`/barbershops/${tenantId}`);
  return data;
}

export async function listBarbershopBarbers(
  tenantId: string,
  serviceId?: string,
): Promise<EmployeeSummary[]> {
  const { data } = await clientApi.get<EmployeeSummary[]>(`/barbershops/${tenantId}/barbers`, {
    params: serviceId ? { service_id: serviceId } : undefined,
  });
  return data;
}

export async function getAvailability(
  tenantId: string,
  params: { employee_id: string; service_id: string; date: string },
): Promise<AvailabilityResponse> {
  const { data } = await clientApi.get<AvailabilityResponse>(
    `/barbershops/${tenantId}/availability`,
    { params },
  );
  return data;
}
