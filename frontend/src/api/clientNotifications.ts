import { clientApi } from "@/lib/clientApi";
import type { Page } from "@/types/common";
import type { Notification } from "@/types/notification";

export async function listClientNotifications(page = 1, limit = 20): Promise<Page<Notification>> {
  const { data } = await clientApi.get<Page<Notification>>("/notifications", { params: { page, limit } });
  return data;
}

export async function markAllClientNotificationsRead(): Promise<void> {
  await clientApi.post("/notifications/read-all");
}
