import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createSupplier, updateSupplier } from "@/api/suppliers";
import { Modal } from "@/components/Modal";
import type { Supplier } from "@/types/supplier";

const schema = z.object({
  name: z.string().min(2, "Informe o nome do fornecedor"),
  phone: z.string().optional(),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface SupplierFormModalProps {
  supplier?: Supplier;
  onClose: () => void;
}

export function SupplierFormModal({ supplier, onClose }: SupplierFormModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(supplier);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      notes: supplier?.notes ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        notes: values.notes || null,
      };
      return isEditing ? updateSupplier(supplier!.id, payload) : createSupplier(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onClose();
    },
    onError: () => setServerError("Não foi possível salvar o fornecedor."),
  });

  return (
    <Modal title={isEditing ? "Editar fornecedor" : "Novo fornecedor"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Nome
          </label>
          <input
            id="name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("name")}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Telefone (opcional)
          </label>
          <input
            id="phone"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("phone")}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail (opcional)
          </label>
          <input
            id="email"
            type="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
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
