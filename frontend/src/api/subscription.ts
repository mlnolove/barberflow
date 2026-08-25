import { api } from "@/lib/api";
import type { CheckoutResponse, Subscription, SubscriptionPlan } from "@/types/subscription";

export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const { data } = await api.get<SubscriptionPlan[]>("/subscription/plans");
  return data;
}

export async function getSubscription(): Promise<Subscription> {
  const { data } = await api.get<Subscription>("/subscription");
  return data;
}

export async function cancelSubscription(): Promise<Subscription> {
  const { data } = await api.post<Subscription>("/subscription/cancel");
  return data;
}

export async function createSubscriptionCheckout(): Promise<CheckoutResponse> {
  const { data } = await api.post<CheckoutResponse>("/subscription/checkout");
  return data;
}
