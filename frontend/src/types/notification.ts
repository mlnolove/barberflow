export type NotificationType =
  | "NEW_APPOINTMENT"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_REJECTED"
  | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER"
  | "NEW_MESSAGE"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "SUBSCRIPTION_RENEWED";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata_json: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}
