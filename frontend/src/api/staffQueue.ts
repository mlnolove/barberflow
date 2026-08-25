import { api } from "@/lib/api";
import type { QueueCompletePayload, QueueEntryCreatePayload, StaffQueueEntry } from "@/types/staffQueue";

export async function listQueue(): Promise<StaffQueueEntry[]> {
  const { data } = await api.get<StaffQueueEntry[]>("/queue");
  return data;
}

export async function addToQueue(payload: QueueEntryCreatePayload): Promise<StaffQueueEntry> {
  const { data } = await api.post<StaffQueueEntry>("/queue", payload);
  return data;
}

export async function callNext(employeeId?: string): Promise<StaffQueueEntry> {
  const { data } = await api.post<StaffQueueEntry>("/queue/call-next", null, {
    params: employeeId ? { employee_id: employeeId } : undefined,
  });
  return data;
}

export async function startQueueService(entryId: string): Promise<StaffQueueEntry> {
  const { data } = await api.post<StaffQueueEntry>(`/queue/${entryId}/start`);
  return data;
}

export async function completeQueueEntry(
  entryId: string,
  payload: QueueCompletePayload,
): Promise<StaffQueueEntry> {
  const { data } = await api.post<StaffQueueEntry>(`/queue/${entryId}/complete`, payload);
  return data;
}

export async function cancelQueueEntry(entryId: string, reason: string): Promise<StaffQueueEntry> {
  const { data } = await api.post<StaffQueueEntry>(`/queue/${entryId}/cancel`, { reason });
  return data;
}

export async function markQueueNoShow(entryId: string): Promise<StaffQueueEntry> {
  const { data } = await api.post<StaffQueueEntry>(`/queue/${entryId}/no-show`);
  return data;
}
