import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cancelAppointment } from "@/api/appointments";
import { Modal } from "@/components/Modal";
import type { Appointment } from "@/types/appointment";

const schema = z.object({
  reason: z.string().min(3, "Informe o motivo do cancelamento"),
});

type FormValues = z.infer<typeof schema>;

interface CancelModalProps {
  appointment: Appointment;
  onClose: () => void;
}

export function CancelModal({ appointment, onClose }: CancelModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => cancelAppointment(appointment.id, values.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: () => setServerError("Não foi possível cancelar o agendamento."),
  });

  return (
    <Modal title={`Cancelar — ${appointment.customer.full_name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Motivo do cancelamento
          </label>
          <textarea
            id="reason"
            rows={3}
            placeholder="Ex.: Cliente solicitou cancelamento."
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("reason")}
          />
          {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Cancelando..." : "Confirmar cancelamento"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
