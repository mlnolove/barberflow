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
          <span className="block text-sm font-medium">Tipo</span>
          <div className="mt-1 flex rounded-md border border-slate-300 text-sm dark:border-slate-700">
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
          <label htmlFor="category" className="block text-sm font-medium">
            Categoria
          </label>
          <input
            id="category"
            list="category-options"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("category")}
          />
          <datalist id="category-options">
            {categoryOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {errors.category && (
            <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Descrição
          </label>
          <input
            id="description"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium">
              Valor (R$)
            </label>
            <input
              id="amount"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="transaction_date" className="block text-sm font-medium">
              Data
            </label>
            <input
              id="transaction_date"
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("transaction_date")}
            />
          </div>
        </div>

        <div>
          <label htmlFor="payment_method_id" className="block text-sm font-medium">
            Forma de pagamento
          </label>
          <select
            id="payment_method_id"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
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
            <p className="mt-1 text-xs text-red-600">{errors.payment_method_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium">
            Observações (opcional)
          </label>
          <textarea
            id="notes"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("notes")}
          />
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
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
