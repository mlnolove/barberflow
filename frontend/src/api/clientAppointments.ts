import { clientApi } from "@/lib/clientApi";
import type { ClientAppointment } from "@/types/clientAppointment";

export interface BookAppointmentPayload {
  tenant_id: string;
  employee_id: string;
  service_id: string;
  starts_at: string;
  notes?: string;
}

export async function bookAppointment(payload: BookAppointmentPayload): Promise<ClientAppointment> {
  const { data } = await clientApi.post<ClientAppointment>("/appointments", payload);
  return data;
}

export async function listMyAppointments(
  scope: "upcoming" | "history" | "all" = "upcoming",
): Promise<ClientAppointment[]> {
  const { data } = await clientApi.get<ClientAppointment[]>("/appointments", { params: { scope } });
  return data;
}

export async function getMyAppointment(id: string): Promise<ClientAppointment> {
  const { data } = await clientApi.get<ClientAppointment>(`/appointments/${id}`);
  return data;
}

export async function cancelMyAppointment(id: string, reason: string): Promise<ClientAppointment> {
  const { data } = await clientApi.post<ClientAppointment>(`/appointments/${id}/cancel`, { reason });
  return data;
}
