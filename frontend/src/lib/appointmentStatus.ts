import type { AppointmentStatus } from "@/types/appointment";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export const STATUS_CHIP_STYLES: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-950/40 text-amber-300",
  CONFIRMED: "bg-blue-950/40 text-blue-300",
  IN_PROGRESS: "bg-purple-950/40 text-purple-300",
  COMPLETED: "bg-emerald-950/40 text-emerald-300",
  CANCELLED: "bg-ink-800 text-ink-400",
  NO_SHOW: "bg-red-950/40 text-red-300",
};

export const STATUS_DOT_COLORS: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-400",
  CONFIRMED: "bg-blue-400",
  IN_PROGRESS: "bg-purple-400",
  COMPLETED: "bg-emerald-400",
  CANCELLED: "bg-ink-500",
  NO_SHOW: "bg-red-400",
};

export const ALL_APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];
