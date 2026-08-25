import { api } from "@/lib/api";
import type { Page } from "@/types/common";
import type { Notification } from "@/types/notification";

export async function listNotifications(page = 1, limit = 20): Promise<Page<Notification>> {
  const { data } = await api.get<Page<Notification>>("/notifications", { params: { page, limit } });
  return data;
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all");
}
