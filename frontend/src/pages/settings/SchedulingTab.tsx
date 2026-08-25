import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CalendarClock, Users } from "lucide-react";
import { z } from "zod";

import { updateTenantSettings } from "@/api/settings";
import type { Tenant } from "@/types/auth";

const schedulingSchema = z.object({
  scheduling_mode: z.enum(["TIME_SLOT", "QUEUE"]),
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
  auto_approve_appointments: z.boolean(),
  cancellation_deadline_minutes: z.string().optional(),
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
    control,
    formState: { errors, isSubmitting },
  } = useForm<SchedulingFormValues>({
    resolver: zodResolver(schedulingSchema),
    defaultValues: {
      scheduling_mode: tenant.scheduling_mode,
      min_advance_minutes: tenant.min_advance_minutes,
      max_advance_days: tenant.max_advance_days,
      appointment_buffer_minutes: tenant.appointment_buffer_minutes,
      allow_cancellation: tenant.allow_cancellation,
      auto_approve_appointments: tenant.auto_approve_appointments,
      cancellation_deadline_minutes: tenant.cancellation_deadline_minutes?.toString() ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: SchedulingFormValues) =>
      updateTenantSettings({
        scheduling_mode: values.scheduling_mode,
        min_advance_minutes: values.min_advance_minutes,
        max_advance_days: values.max_advance_days,
        appointment_buffer_minutes: values.appointment_buffer_minutes,
        allow_cancellation: values.allow_cancellation,
        auto_approve_appointments: values.auto_approve_appointments,
        cancellation_deadline_minutes: values.cancellation_deadline_minutes
          ? Number(values.cancellation_deadline_minutes)
          : null,
      }),
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
        <span className="field-label">Modo de agendamento</span>
        <Controller
          control={control}
          name="scheduling_mode"
          render={({ field }) => (
            <div className="mt-1 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => field.onChange("TIME_SLOT")}
                className={`rounded-xl border p-3 text-left disabled:opacity-60 ${
                  field.value === "TIME_SLOT" ? "border-gold bg-gold/[0.08]" : "border-white/[0.08]"
                }`}
              >
                <CalendarClock size={16} className={field.value === "TIME_SLOT" ? "text-gold" : "text-ink-500"} />
                <p className="mt-1.5 text-sm font-medium text-white">Por horário</p>
                <p className="text-xs text-ink-500">Cliente escolhe barbeiro, serviço e horário.</p>
              </button>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => field.onChange("QUEUE")}
                className={`rounded-xl border p-3 text-left disabled:opacity-60 ${
                  field.value === "QUEUE" ? "border-gold bg-gold/[0.08]" : "border-white/[0.08]"
                }`}
              >
                <Users size={16} className={field.value === "QUEUE" ? "text-gold" : "text-ink-500"} />
                <p className="mt-1.5 text-sm font-medium text-white">Fila de espera</p>
                <p className="text-xs text-ink-500">Cliente entra na fila e é chamado por ordem de chegada.</p>
              </button>
            </div>
          )}
        />
      </div>

      <div>
        <label htmlFor="min_advance_minutes" className="field-label">
          Antecedência mínima para agendar (minutos)
        </label>
        <input
          id="min_advance_minutes"
          type="number"
          disabled={!canEdit}
          className="field-input w-40 disabled:opacity-60"
          {...register("min_advance_minutes")}
        />
        <p className="mt-1 text-xs text-ink-500">
          Impede que um horário seja marcado em cima da hora. Ex.: 60 = só é possível agendar com
          1 hora de antecedência.
        </p>
        {errors.min_advance_minutes && (
          <p className="field-error">{errors.min_advance_minutes.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="max_advance_days" className="field-label">
          Antecedência máxima para agendar (dias)
        </label>
        <input
          id="max_advance_days"
          type="number"
          disabled={!canEdit}
          className="field-input w-40 disabled:opacity-60"
          {...register("max_advance_days")}
        />
        <p className="mt-1 text-xs text-ink-500">
          Até quantos dias no futuro a agenda fica aberta para novos agendamentos.
        </p>
        {errors.max_advance_days && (
          <p className="field-error">{errors.max_advance_days.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="appointment_buffer_minutes" className="field-label">
          Intervalo entre atendimentos (minutos)
        </label>
        <input
          id="appointment_buffer_minutes"
          type="number"
          disabled={!canEdit}
          className="field-input w-40 disabled:opacity-60"
          {...register("appointment_buffer_minutes")}
        />
        <p className="mt-1 text-xs text-ink-500">
          Tempo de folga reservado automaticamente entre um atendimento e o próximo do mesmo
          profissional.
        </p>
        {errors.appointment_buffer_minutes && (
          <p className="field-error">{errors.appointment_buffer_minutes.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="cancellation_deadline_minutes" className="field-label">
          Prazo mínimo pro cliente cancelar (minutos, opcional)
        </label>
        <input
          id="cancellation_deadline_minutes"
          type="number"
          disabled={!canEdit}
          placeholder="Sem limite"
          className="field-input w-40 disabled:opacity-60"
          {...register("cancellation_deadline_minutes")}
        />
        <p className="mt-1 text-xs text-ink-500">
          Ex.: 120 = cliente só cancela pelo app até 2h antes do horário. Deixe em branco pra não
          ter limite. Não afeta cancelamentos feitos pela equipe.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-white">
        <input type="checkbox" disabled={!canEdit} {...register("allow_cancellation")} />
        Permitir cancelamento de agendamentos
      </label>
      <p className="-mt-3 text-xs text-ink-500">
        Se desativado, agendamentos só podem ser encerrados como concluído ou não compareceu.
      </p>

      <label className="flex items-center gap-2 text-sm font-medium text-white">
        <input type="checkbox" disabled={!canEdit} {...register("auto_approve_appointments")} />
        Confirmar agendamentos automaticamente
      </label>
      <p className="-mt-3 text-xs text-ink-500">
        Se desativado, todo agendamento feito pelo cliente entra como pendente até a equipe
        confirmar.
      </p>

      {mutation.isError && (
        <p className="text-sm text-red-400">Não foi possível salvar. Verifique os dados informados.</p>
      )}

      {canEdit && (
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
          {justSaved && <span className="text-sm text-emerald-400">Salvo!</span>}
        </div>
      )}
    </form>
  );
}
