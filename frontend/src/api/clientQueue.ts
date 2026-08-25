import { clientApi } from "@/lib/clientApi";
import type { QueueEntry } from "@/types/clientQueue";

export interface JoinQueuePayload {
  tenant_id: string;
  service_id: string;
  employee_id?: string;
}

export async function joinQueue(payload: JoinQueuePayload): Promise<QueueEntry> {
  const { data } = await clientApi.post<QueueEntry>("/queue", payload);
  return data;
}

export async function listMyQueueEntries(): Promise<QueueEntry[]> {
  const { data } = await clientApi.get<QueueEntry[]>("/queue");
  return data;
}

export async function getMyQueueEntry(entryId: string): Promise<QueueEntry> {
  const { data } = await clientApi.get<QueueEntry>(`/queue/${entryId}`);
  return data;
}

export async function cancelMyQueueEntry(entryId: string, reason: string): Promise<QueueEntry> {
  const { data } = await clientApi.post<QueueEntry>(`/queue/${entryId}/cancel`, { reason });
  return data;
}
