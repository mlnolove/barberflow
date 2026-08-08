import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { updateTenantSettings } from "@/api/settings";
import type { Tenant } from "@/types/auth";

const schedulingSchema = z.object({
  min_advance_minutes: z.coerce
    .number()
    .int("Use um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(10080, "Máximo de 10.080 minutos (7 dias)"),
  max_advance_days: z.coerce
    .number()
    .int("Use um número inteiro")
    .min(1, "Mínimo de 1 dia")
    .max(365, "Máximo de 365 dias"),
  appointment_buffer_minutes: z.coerce
    .number()
    .int("Use um número inteiro")
    .min(0, "Não pode ser negativo")
    .max(120, "Máximo de 120 minutos"),
  allow_cancellation: z.boolean(),
});

type SchedulingFormValues = z.infer<typeof schedulingSchema>;

interface SchedulingTabProps {
  tenant: Tenant;
  canEdit: boolean;
}

export function SchedulingTab({ tenant, canEdit }: SchedulingTabProps) {
  const queryClient = useQueryClient();
  const [justSaved, setJustSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SchedulingFormValues>({
    resolver: zodResolver(schedulingSchema),
    defaultValues: {
      min_advance_minutes: tenant.min_advance_minutes,
      max_advance_days: tenant.max_advance_days,
      appointment_buffer_minutes: tenant.appointment_buffer_minutes,
      allow_cancellation: tenant.allow_cancellation,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: SchedulingFormValues) => updateTenantSettings(values),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings-tenant"], updated);
      setJustSaved(true);
    },
  });

  useEffect(() => {
    if (!justSaved) return;
    const timeout = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(timeout);
  }, [justSaved]);

  return (
    <form
      className="max-w-xl space-y-5"
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
    >
      <div>
        <label htmlFor="min_advance_minutes" className="block text-sm font-medium">
          Antecedência mínima para agendar (minutos)
        </label>
        <input
          id="min_advance_minutes"
          type="number"
          disabled={!canEdit}
          className="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          {...register("min_advance_minutes")}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Impede que um horário seja marcado em cima da hora. Ex.: 60 = só é possível agendar com
          1 hora de antecedência.
        </p>
        {errors.min_advance_minutes && (
          <p className="mt-1 text-xs text-red-600">{errors.min_advance_minutes.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="max_advance_days" className="block text-sm font-medium">
          Antecedência máxima para agendar (dias)
        </label>
        <input
          id="max_advance_days"
          type="number"
          disabled={!canEdit}
          className="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          {...register("max_advance_days")}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Até quantos dias no futuro a agenda fica aberta para novos agendamentos.
        </p>
        {errors.max_advance_days && (
          <p className="mt-1 text-xs text-red-600">{errors.max_advance_days.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="appointment_buffer_minutes" className="block text-sm font-medium">
          Intervalo entre atendimentos (minutos)
        </label>
        <input
          id="appointment_buffer_minutes"
          type="number"
          disabled={!canEdit}
          className="mt-1 w-40 rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          {...register("appointment_buffer_minutes")}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tempo de folga reservado automaticamente entre um atendimento e o próximo do mesmo
          profissional.
        </p>
        {errors.appointment_buffer_minutes && (
          <p className="mt-1 text-xs text-red-600">{errors.appointment_buffer_minutes.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" disabled={!canEdit} {...register("allow_cancellation")} />
        Permitir cancelamento de agendamentos
      </label>
      <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">
        Se desativado, agendamentos só podem ser encerrados como concluído ou não compareceu.
      </p>

      {mutation.isError && (
        <p className="text-sm text-red-600">Não foi possível salvar. Verifique os dados informados.</p>
      )}

      {canEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
          {justSaved && <span className="text-sm text-emerald-600 dark:text-emerald-400">Salvo!</span>}
        </div>
      )}
    </form>
  );
}
