import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAxiosError } from "axios";
import { z } from "zod";

import { listCustomers } from "@/api/customers";
import { listEmployees } from "@/api/employees";
import { listServices } from "@/api/services";
import { addToQueue } from "@/api/staffQueue";
import { Modal } from "@/components/Modal";

const schema = z.object({
  customer_id: z.string().min(1, "Selecione o cliente"),
  service_id: z.string().min(1, "Selecione o serviço"),
  employee_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function QueueJoinModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: customersPage } = useQuery({
    queryKey: ["customers", { status: "active-for-select" }],
    queryFn: () => listCustomers({ is_active: true, limit: 100 }),
  });
  const { data: servicesPage } = useQuery({
    queryKey: ["services", { status: "active-for-select" }],
    queryFn: () => listServices({ is_active: true, limit: 100 }),
  });
  const { data: employeesPage } = useQuery({
    queryKey: ["employees", { status: "active-for-select" }],
    queryFn: () => listEmployees({ is_active: true, limit: 100 }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      addToQueue({
        customer_id: values.customer_id,
        service_id: values.service_id,
        employee_id: values.employee_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setServerError(message ?? "Não foi possível adicionar à fila.");
    },
  });

  return (
    <Modal title="Adicionar à fila" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div>
          <label htmlFor="customer_id" className="field-label">
            Cliente
          </label>
          <select id="customer_id" className="field-input" {...register("customer_id")}>
            <option value="">Selecione...</option>
            {customersPage?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} — {c.phone}
              </option>
            ))}
          </select>
          {errors.customer_id && <p className="field-error">{errors.customer_id.message}</p>}
        </div>

        <div>
          <label htmlFor="service_id" className="field-label">
            Serviço
          </label>
          <select id="service_id" className="field-input" {...register("service_id")}>
            <option value="">Selecione...</option>
            {servicesPage?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} min)
              </option>
            ))}
          </select>
          {errors.service_id && <p className="field-error">{errors.service_id.message}</p>}
        </div>

        <div>
          <label htmlFor="employee_id" className="field-label">
            Profissional (opcional)
          </label>
          <select id="employee_id" className="field-input" {...register("employee_id")}>
            <option value="">Qualquer um disponível</option>
            {employeesPage?.items.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Adicionando..." : "Adicionar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
