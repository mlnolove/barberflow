import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { confirmAppointment, markNoShow, startAppointment } from "@/api/appointments";
import { CancelModal } from "@/components/appointments/CancelModal";
import { CompleteModal } from "@/components/appointments/CompleteModal";
import { RescheduleModal } from "@/components/appointments/RescheduleModal";
import { formatTime } from "@/lib/datetime";
import { STATUS_CHIP_STYLES as STATUS_STYLES, STATUS_LABELS } from "@/lib/appointmentStatus";
import { useAuthStore } from "@/store/authStore";
import type { Appointment } from "@/types/appointment";

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
    <div className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-ink-900 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div className="w-14 shrink-0 font-mono text-sm font-semibold text-white">
          {formatTime(appointment.starts_at)}
        </div>
        <div>
          <p className="font-medium text-white">{appointment.customer.full_name}</p>
          <p className="text-sm text-ink-500">
            {appointment.service.name} · {appointment.employee.full_name}
          </p>
          {appointment.notes && <p className="mt-1 text-xs text-ink-600">{appointment.notes}</p>}
          {appointment.status === "CANCELLED" && appointment.cancellation_reason && (
            <p className="mt-1 text-xs text-red-400">Motivo: {appointment.cancellation_reason}</p>
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
            className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
          >
            Confirmar
          </button>
        )}
        {appointment.status === "CONFIRMED" && hasPermission("appointments.start") && (
          <button
            onClick={() => startMutation.mutate()}
            className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
          >
            Iniciar
          </button>
        )}
        {appointment.status === "IN_PROGRESS" && hasPermission("appointments.complete") && (
          <button
            onClick={() => setModal("complete")}
            className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
          >
            Finalizar
          </button>
        )}
        {isOpen && hasPermission("appointments.edit") && (
          <button
            onClick={() => setModal("reschedule")}
            className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
          >
            Remarcar
          </button>
        )}
        {isOpen && hasPermission("appointments.cancel") && (
          <>
            <button
              onClick={() => noShowMutation.mutate()}
              className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
            >
              Não compareceu
            </button>
            <button
              onClick={() => setModal("cancel")}
              className="rounded-md border border-red-900/40 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
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
