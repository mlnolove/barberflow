import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { cancelQueueEntry } from "@/api/staffQueue";
import { Modal } from "@/components/Modal";
import type { StaffQueueEntry } from "@/types/staffQueue";

const schema = z.object({
  reason: z.string().min(3, "Informe o motivo do cancelamento"),
});

type FormValues = z.infer<typeof schema>;

interface QueueCancelModalProps {
  entry: StaffQueueEntry;
  onClose: () => void;
}

export function QueueCancelModal({ entry, onClose }: QueueCancelModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => cancelQueueEntry(entry.id, values.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      onClose();
    },
    onError: () => setServerError("Não foi possível cancelar esta entrada da fila."),
  });

  return (
    <Modal title={`Cancelar — ${entry.customer.full_name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div>
          <label htmlFor="reason" className="field-label">
            Motivo do cancelamento
          </label>
          <textarea id="reason" rows={3} className="field-input" {...register("reason")} />
          {errors.reason && <p className="field-error">{errors.reason.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
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
