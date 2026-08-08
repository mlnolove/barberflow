import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createStockAdjustment } from "@/api/inventory";
import { Modal } from "@/components/Modal";
import type { Product } from "@/types/product";

const schema = z.object({
  new_quantity: z.coerce.number().int().min(0, "Deve ser maior ou igual a zero"),
  reason: z.string().min(3, "Informe o motivo do ajuste"),
});

type FormValues = z.infer<typeof schema>;

interface AdjustmentModalProps {
  product: Product;
  onClose: () => void;
}

export function AdjustmentModal({ product, onClose }: AdjustmentModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { new_quantity: product.current_quantity },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createStockAdjustment(product.id, {
        new_quantity: values.new_quantity,
        reason: values.reason,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["movements", product.id] });
      onClose();
    },
    onError: () => setServerError("Não foi possível ajustar o estoque."),
  });

  return (
    <Modal title={`Ajustar estoque — ${product.name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Estoque no sistema: <span className="font-medium">{product.current_quantity}</span>
        </p>

        <div>
          <label htmlFor="new_quantity" className="block text-sm font-medium">
            Estoque físico (contagem real)
          </label>
          <input
            id="new_quantity"
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("new_quantity")}
          />
          {errors.new_quantity && (
            <p className="mt-1 text-xs text-red-600">{errors.new_quantity.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Motivo do ajuste
          </label>
          <textarea
            id="reason"
            rows={2}
            placeholder="Ex.: Contagem física divergente do sistema"
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
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Confirmar ajuste"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
