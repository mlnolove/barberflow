import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createAppointment } from "@/api/appointments";
import { listCustomers } from "@/api/customers";
import { listEmployees } from "@/api/employees";
import { listServices } from "@/api/services";
import { Modal } from "@/components/Modal";
import { toLocalISOString } from "@/lib/datetime";

const schema = z.object({
  customer_id: z.string().min(1, "Selecione o cliente"),
  service_id: z.string().min(1, "Selecione o serviço"),
  employee_id: z.string().min(1, "Selecione o profissional"),
  date: z.string().min(1, "Informe a data"),
  time: z.string().min(1, "Informe o horário"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AppointmentFormModalProps {
  defaultDate?: string;
  onClose: () => void;
}

export function AppointmentFormModal({ defaultDate, onClose }: AppointmentFormModalProps) {
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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: defaultDate ?? "", time: "10:00" },
  });

  const selectedServiceId = watch("service_id");
  const eligibleEmployees = useMemo(() => {
    const employees = employeesPage?.items ?? [];
    if (!selectedServiceId) return employees;
    return employees.filter((e) => e.services.some((s) => s.id === selectedServiceId));
  }, [employeesPage, selectedServiceId]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createAppointment({
        customer_id: values.customer_id,
        service_id: values.service_id,
        employee_id: values.employee_id,
        starts_at: toLocalISOString(values.date, values.time),
        notes: values.notes || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível criar o agendamento.";
      setServerError(message);
    },
  });

  return (
    <Modal title="Novo agendamento" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <div>
          <label htmlFor="customer_id" className="block text-sm font-medium">
            Cliente
          </label>
          <select
            id="customer_id"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("customer_id")}
          >
            <option value="">Selecione...</option>
            {customersPage?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} — {c.phone}
              </option>
            ))}
          </select>
          {errors.customer_id && (
            <p className="mt-1 text-xs text-red-600">{errors.customer_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="service_id" className="block text-sm font-medium">
            Serviço
          </label>
          <select
            id="service_id"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("service_id")}
          >
            <option value="">Selecione...</option>
            {servicesPage?.items.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.duration_minutes} min)
              </option>
            ))}
          </select>
          {errors.service_id && (
            <p className="mt-1 text-xs text-red-600">{errors.service_id.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="employee_id" className="block text-sm font-medium">
            Profissional
          </label>
          <select
            id="employee_id"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("employee_id")}
          >
            <option value="">Selecione...</option>
            {eligibleEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name}
              </option>
            ))}
          </select>
          {errors.employee_id && (
            <p className="mt-1 text-xs text-red-600">{errors.employee_id.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="date" className="block text-sm font-medium">
              Data
            </label>
            <input
              id="date"
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("date")}
            />
            {errors.date && <p className="mt-1 text-xs text-red-600">{errors.date.message}</p>}
          </div>
          <div>
            <label htmlFor="time" className="block text-sm font-medium">
              Hora
            </label>
            <input
              id="time"
              type="time"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("time")}
            />
            {errors.time && <p className="mt-1 text-xs text-red-600">{errors.time.message}</p>}
          </div>
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
            {isSubmitting ? "Agendando..." : "Agendar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
