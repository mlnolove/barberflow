import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createTransaction, listPaymentMethods } from "@/api/financial";
import { Modal } from "@/components/Modal";
import type { TransactionType } from "@/types/financial";

const INCOME_CATEGORIES = ["Serviço", "Produto", "Outros"];
const EXPENSE_CATEGORIES = ["Aluguel", "Salário", "Fornecedor", "Energia", "Água", "Internet", "Outros"];

const schema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.string().min(2, "Informe a categoria"),
  description: z.string().min(2, "Informe a descrição"),
  amount: z
    .string()
    .min(1, "Informe o valor")
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Valor inválido"),
  transaction_date: z.string().min(1, "Informe a data"),
  payment_method_id: z.string().min(1, "Selecione a forma de pagamento"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TransactionFormModalProps {
  defaultType?: TransactionType;
  onClose: () => void;
}

export function TransactionFormModal({ defaultType = "INCOME", onClose }: TransactionFormModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: listPaymentMethods,
  });
  const activeMethods = paymentMethods?.filter((m) => m.is_active) ?? [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      transaction_date: new Date().toISOString().slice(0, 10),
    },
  });

  const type = watch("type");
  const categoryOptions = type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createTransaction({
        ...values,
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível registrar o lançamento.";
      setServerError(message);
    },
  });

  return (
    <Modal title="Novo lançamento" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div>
          <span className="field-label">Tipo</span>
          <div className="mt-1 flex rounded-md border border-white/[0.08] text-sm text-ink-300">
            <label className="flex-1">
              <input type="radio" value="INCOME" className="peer sr-only" {...register("type")} />
              <span className="block cursor-pointer rounded-l-md px-3 py-2 text-center peer-checked:bg-emerald-600 peer-checked:text-white">
                Entrada
              </span>
            </label>
            <label className="flex-1">
              <input type="radio" value="EXPENSE" className="peer sr-only" {...register("type")} />
              <span className="block cursor-pointer rounded-r-md px-3 py-2 text-center peer-checked:bg-red-600 peer-checked:text-white">
                Saída
              </span>
            </label>
          </div>
        </div>

        <div>
          <label htmlFor="category" className="field-label">
            Categoria
          </label>
          <input
            id="category"
            list="category-options"
            className="field-input"
            {...register("category")}
          />
          <datalist id="category-options">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && (
            <p className="field-error">{errors.category.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            Descrição
          </label>
          <input
            id="description"
            className="field-input"
            {...register("description")}
          />
          {errors.description && (
            <p className="field-error">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="field-label">
              Valor (R$)
            </label>
            <input
              id="amount"
              className="field-input"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="field-error">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="transaction_date" className="field-label">
              Data
            </label>
            <input
              id="transaction_date"
              type="date"
              className="field-input"
              {...register("transaction_date")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="payment_method_id" className="field-label">
            Forma de pagamento
          </label>
          <select
            id="payment_method_id"
            className="field-input"
            {...register("payment_method_id")}
          >
            <option value="">Selecione...</option>
            {activeMethods.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          {errors.payment_method_id && (
            <p className="field-error">{errors.payment_method_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="field-label">
            Observações (opcional)
          </label>
          <textarea
            id="notes"
            rows={2}
            className="field-input"
            {...register("notes")}
          />
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
