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
        <p className="text-sm text-ink-500">
          Estoque no sistema: <span className="font-medium text-white">{product.current_quantity}</span>
        </p>

        <div>
          <label htmlFor="new_quantity" className="field-label">
            Estoque físico (contagem real)
          </label>
          <input
            id="new_quantity"
            type="number"
            className="field-input"
            {...register("new_quantity")}
          />
          {errors.new_quantity && (
            <p className="field-error">{errors.new_quantity.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="reason" className="field-label">
            Motivo do ajuste
          </label>
          <textarea
            id="reason"
            rows={2}
            placeholder="Ex.: Contagem física divergente do sistema"
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
            {isSubmitting ? "Salvando..." : "Confirmar ajuste"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
