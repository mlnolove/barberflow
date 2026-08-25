import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CreditCard,
  MessageCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { NotificationType } from "@/types/notification";

export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  NEW_APPOINTMENT: CalendarClock,
  APPOINTMENT_CONFIRMED: CalendarCheck,
  APPOINTMENT_REJECTED: CalendarX,
  APPOINTMENT_CANCELLED: CalendarX,
  APPOINTMENT_REMINDER: CalendarClock,
  NEW_MESSAGE: MessageCircle,
  PAYMENT_CONFIRMED: CreditCard,
  PAYMENT_FAILED: XCircle,
  SUBSCRIPTION_RENEWED: CreditCard,
};

export function notificationIcon(type: NotificationType): LucideIcon {
  return NOTIFICATION_ICONS[type] ?? Bell;
}
