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
        <p className="text-sm text-ink-500">
          Estoque atual: <span className="font-medium text-white">{product.current_quantity}</span>
        </p>

        <div>
          <label htmlFor="quantity" className="field-label">
            Quantidade
          </label>
          <input
            id="quantity"
            type="number"
            className="field-input"
            {...register("quantity")}
          />
          {errors.quantity && (
            <p className="field-error">{errors.quantity.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="field-label">
            Motivo
          </label>
          <textarea
            id="reason"
            rows={2}
            placeholder={REASON_PLACEHOLDERS[type]}
            className="field-input"
            {...register("reason")}
          />
          {errors.reason && <p className="field-error">{errors.reason.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Salvando..." : "Confirmar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
