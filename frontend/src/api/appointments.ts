import { api } from "@/lib/api";
import type {
  Appointment,
  AppointmentPayload,
  AppointmentStatus,
  CompletePayload,
  ReschedulePayload,
} from "@/types/appointment";

export interface AppointmentListParams {
  start: string;
  end: string;
  employee_id?: string;
  status?: AppointmentStatus;
}

export async function listAppointments(params: AppointmentListParams): Promise<Appointment[]> {
  const { data } = await api.get<Appointment[]>("/appointments", { params });
  return data;
}

export async function createAppointment(payload: AppointmentPayload): Promise<Appointment> {
  const { data } = await api.post<Appointment>("/appointments", payload);
  return data;
}

export async function rescheduleAppointment(
  id: string,
  payload: ReschedulePayload,
): Promise<Appointment> {
  const { data } = await api.patch<Appointment>(`/appointments/${id}/reschedule`, payload);
  return data;
}

export async function confirmAppointment(id: string): Promise<Appointment> {
  const { data } = await api.post<Appointment>(`/appointments/${id}/confirm`);
  return data;
}

export async function startAppointment(id: string): Promise<Appointment> {
  const { data } = await api.post<Appointment>(`/appointments/${id}/start`);
  return data;
}

export async function completeAppointment(
  id: string,
  payload: CompletePayload,
): Promise<Appointment> {
  const { data } = await api.post<Appointment>(`/appointments/${id}/complete`, payload);
  return data;
}

export async function cancelAppointment(id: string, reason: string): Promise<Appointment> {
  const { data } = await api.post<Appointment>(`/appointments/${id}/cancel`, { reason });
  return data;
}

export async function markNoShow(id: string): Promise<Appointment> {
  const { data } = await api.post<Appointment>(`/appointments/${id}/no-show`);
  return data;
}
