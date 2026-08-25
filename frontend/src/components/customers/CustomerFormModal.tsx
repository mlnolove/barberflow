import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createCustomer, updateCustomer } from "@/api/customers";
import { Modal } from "@/components/Modal";
import type { Customer } from "@/types/customer";

const customerSchema = z.object({
  full_name: z.string().min(2, "Informe o nome completo"),
  phone: z.string().refine((value) => value.replace(/\D/g, "").length >= 10, {
    message: "Telefone inválido. Informe um número com DDD.",
  }),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
  birth_date: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormModalProps {
  customer?: Customer;
  onClose: () => void;
  onSaved?: (customer: Customer) => void;
}

export function CustomerFormModal({ customer, onClose, onSaved }: CustomerFormModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(customer);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: customer?.full_name ?? "",
      phone: customer?.phone ?? "",
      email: customer?.email ?? "",
      birth_date: customer?.birth_date ?? "",
      address: customer?.address ?? "",
      notes: customer?.notes ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const payload = {
        full_name: values.full_name,
        phone: values.phone,
        email: values.email || null,
        birth_date: values.birth_date || null,
        address: values.address || null,
        notes: values.notes || null,
      };
      return isEditing ? updateCustomer(customer!.id, payload) : createCustomer(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onSaved?.(saved);
      onClose();
    },
    onError: () => {
      setServerError("Não foi possível salvar o cliente. Verifique os dados informados.");
    },
  });

  function onSubmit(values: CustomerFormValues) {
    setServerError(null);
    mutation.mutate(values);
  }

  return (
    <Modal title={isEditing ? "Editar cliente" : "Novo cliente"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div>
          <label htmlFor="full_name" className="field-label">
            Nome completo
          </label>
          <input
            id="full_name"
            className="field-input"
            {...register("full_name")}
          />
          {errors.full_name && (
            <p className="field-error">{errors.full_name.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="field-label">
            Telefone
          </label>
          <input
            id="phone"
            placeholder="(11) 91234-5678"
            className="field-input"
            {...register("phone")}
          />
          {errors.phone && <p className="field-error">{errors.phone.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            E-mail (opcional)
          </label>
          <input
            id="email"
            type="email"
            className="field-input"
            {...register("email")}
          />
          {errors.email && <p className="field-error">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="birth_date" className="field-label">
            Data de nascimento (opcional)
          </label>
          <input
            id="birth_date"
            type="date"
            className="field-input"
            {...register("birth_date")}
          />
        </div>

        <div>
          <label htmlFor="address" className="field-label">
            Endereço (opcional)
          </label>
          <input
            id="address"
            className="field-input"
            {...register("address")}
          />
        </div>

        <div>
          <label htmlFor="notes" className="field-label">
            Observações (opcional)
          </label>
          <textarea
            id="notes"
            rows={3}
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
