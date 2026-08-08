import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createStockMovement } from "@/api/inventory";
import { Modal } from "@/components/Modal";
import type { ManualMovementType, Product } from "@/types/product";

const schema = z.object({
  quantity: z.coerce.number().int().positive("Informe uma quantidade maior que zero"),
  reason: z.string().min(3, "Informe o motivo"),
});

type FormValues = z.infer<typeof schema>;

const TITLES: Record<ManualMovementType, string> = {
  ENTRY: "Adicionar estoque",
  RETURN: "Registrar devolução",
  EXIT: "Retirar estoque",
  LOSS: "Registrar perda",
  SALE: "Registrar venda avulsa",
};

const REASON_PLACEHOLDERS: Record<ManualMovementType, string> = {
  ENTRY: "Ex.: Compra de fornecedor",
  RETURN: "Ex.: Cliente devolveu o produto",
  EXIT: "Ex.: Produto utilizado em atendimento",
  LOSS: "Ex.: Produto danificado/vencido",
  SALE: "Ex.: Venda no balcão",
};

interface StockMovementModalProps {
  product: Product;
  type: ManualMovementType;
  onClose: () => void;
}

export function StockMovementModal({ product, type, onClose }: StockMovementModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createStockMovement(product.id, { type, quantity: values.quantity, reason: values.reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["movements", product.id] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível registrar a movimentação.";
      setServerError(message);
    },
  });

  return (
    <Modal title={`${TITLES[type]} — ${product.name}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Estoque atual: <span className="font-medium">{product.current_quantity}</span>
        </p>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium">
            Quantidade
          </label>
          <input
            id="quantity"
            type="number"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("quantity")}
          />
          {errors.quantity && (
            <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="block text-sm font-medium">
            Motivo
          </label>
          <textarea
            id="reason"
            rows={2}
            placeholder={REASON_PLACEHOLDERS[type]}
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
            {isSubmitting ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
