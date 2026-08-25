export type BillingInterval = "MONTHLY" | "ANNUAL";

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type PaymentPurpose = "SUBSCRIPTION" | "APPOINTMENT";

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  billing_interval: BillingInterval;
  price: string;
  trial_days: number;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancelled_at: string | null;
}

export interface CheckoutResponse {
  payment_id: string;
  checkout_url: string | null;
  status: string;
}

export interface SubscriptionPayment {
  id: string;
  purpose: PaymentPurpose;
  amount: string;
  status: PaymentStatus;
  gateway: string | null;
  paid_at: string | null;
  created_at: string;
}
