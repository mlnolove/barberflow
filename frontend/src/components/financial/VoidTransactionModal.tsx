import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { voidTransaction } from "@/api/financial";
import { Modal } from "@/components/Modal";
import type { FinancialTransaction } from "@/types/financial";

const schema = z.object({
  reason: z.string().min(3, "Informe o motivo do estorno"),
});

type FormValues = z.infer<typeof schema>;

interface VoidTransactionModalProps {
  transaction: FinancialTransaction;
  onClose: () => void;
}

export function VoidTransactionModal({ transaction, onClose }: VoidTransactionModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => voidTransaction(transaction.id, values.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      onClose();
    },
    onError: () => setServerError("Não foi possível estornar esta transação."),
  });

  return (
    <Modal title={`Estornar — ${transaction.description}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Isso não apaga o lançamento original — cria uma transação de estorno vinculada a ele,
          mantendo o histórico completo.
        </p>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Motivo do estorno
          </label>
          <textarea
            id="reason"
            rows={3}
            placeholder="Ex.: Lançamento duplicado por engano"
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
            {isSubmitting ? "Estornando..." : "Confirmar estorno"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
