import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { confirmAppointment, markNoShow, startAppointment } from "@/api/appointments";
import { CancelModal } from "@/components/appointments/CancelModal";
import { CompleteModal } from "@/components/appointments/CompleteModal";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";
import { formatTime } from "@/lib/datetime";
import { useAuthStore } from "@/store/authStore";
import type { Appointment, AppointmentStatus } from "@/types/appointment";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  CONFIRMED: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  IN_PROGRESS: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  CANCELLED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  NO_SHOW: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

interface AppointmentRowProps {
  appointment: Appointment;
}

export function AppointmentRow({ appointment }: AppointmentRowProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"reschedule" | "cancel" | "complete" | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["appointments"] });

  const confirmMutation = useMutation({
    mutationFn: () => confirmAppointment(appointment.id),
    onSuccess: invalidate,
  });
  const startMutation = useMutation({
    mutationFn: () => startAppointment(appointment.id),
    onSuccess: invalidate,
  });
  const noShowMutation = useMutation({
    mutationFn: () => markNoShow(appointment.id),
    onSuccess: invalidate,
  });

  const isOpen = appointment.status === "PENDING" || appointment.status === "CONFIRMED";

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <div className="flex items-start gap-4">
        <div className="w-14 shrink-0 text-sm font-semibold">{formatTime(appointment.starts_at)}</div>
        <div>
          <p className="font-medium">{appointment.customer.full_name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {appointment.service.name} · {appointment.employee.full_name}
          </p>
          {appointment.notes && (
            <p className="mt-1 text-xs text-slate-400">{appointment.notes}</p>
          )}
          {appointment.status === "CANCELLED" && appointment.cancellation_reason && (
            <p className="mt-1 text-xs text-red-500">Motivo: {appointment.cancellation_reason}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[appointment.status]}`}
        >
          {STATUS_LABELS[appointment.status]}
        </span>

        {appointment.status === "PENDING" && hasPermission("appointments.confirm") && (
          <button
            onClick={() => confirmMutation.mutate()}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Confirmar
          </button>
        )}
        {appointment.status === "CONFIRMED" && hasPermission("appointments.start") && (
          <button
            onClick={() => startMutation.mutate()}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Iniciar
          </button>
        )}
        {appointment.status === "IN_PROGRESS" && hasPermission("appointments.complete") && (
          <button
            onClick={() => setModal("complete")}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Finalizar
          </button>
        )}
        {isOpen && hasPermission("appointments.edit") && (
          <button
            onClick={() => setModal("reschedule")}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Remarcar
          </button>
        )}
        {isOpen && hasPermission("appointments.cancel") && (
          <>
            <button
              onClick={() => noShowMutation.mutate()}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Não compareceu
            </button>
            <button
              onClick={() => setModal("cancel")}
              className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
            >
              Cancelar
            </button>
          </>
        )}
      </div>

      {modal === "reschedule" && (
        <RescheduleModal appointment={appointment} onClose={() => setModal(null)} />
      )}
      {modal === "cancel" && (
        <CancelModal appointment={appointment} onClose={() => setModal(null)} />
      )}
      {modal === "complete" && (
        <CompleteModal appointment={appointment} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
