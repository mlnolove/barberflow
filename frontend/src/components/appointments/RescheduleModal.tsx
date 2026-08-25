import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { rescheduleAppointment } from "@/api/appointments";
import { Modal } from "@/components/Modal";
import { toLocalISOString } from "@/lib/datetime";
import type { Appointment } from "@/types/appointment";

const schema = z.object({
  date: z.string().min(1, "Informe a data"),
  time: z.string().min(1, "Informe o horário"),
});

type FormValues = z.infer<typeof schema>;

interface RescheduleModalProps {
  appointment: Appointment;
  onClose: () => void;
}

export function RescheduleModal({ appointment, onClose }: RescheduleModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const current = new Date(appointment.starts_at);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: current.toISOString().slice(0, 10),
      time: current.toTimeString().slice(0, 5),
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      rescheduleAppointment(appointment.id, {
        starts_at: toLocalISOString(values.date, values.time),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível remarcar o agendamento.";
      setServerError(message);
    },
  });

  return (
    <Modal title={`Remarcar — ${appointment.customer.full_name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-ink-300">
              Nova data
            </label>
            <input
              id="date"
              type="date"
              className="mt-1 w-full rounded-md border border-white/[0.08] bg-ink-800 px-3 py-2 text-sm text-white"
              {...register("date")}
            />
            {errors.date && <p className="mt-1 text-xs text-red-400">{errors.date.message}</p>}
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-ink-300">
              Novo horário
            </label>
            <input
              id="time"
              type="time"
              className="mt-1 w-full rounded-md border border-white/[0.08] bg-ink-800 px-3 py-2 text-sm text-white"
              {...register("time")}
            />
            {errors.time && <p className="mt-1 text-xs text-red-400">{errors.time.message}</p>}
          </div>
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/[0.08] px-4 py-2 text-sm text-ink-300 hover:bg-ink-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-ink-950 hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Remarcar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
