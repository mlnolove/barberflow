import { api } from "@/lib/api";
import type { Page } from "@/types/common";
import type { SubscriptionPayment } from "@/types/subscription";

export async function listPayments(page = 1, limit = 20): Promise<Page<SubscriptionPayment>> {
  const { data } = await api.get<Page<SubscriptionPayment>>("/payments", {
    params: { page, limit },
  });
  return data;
}
