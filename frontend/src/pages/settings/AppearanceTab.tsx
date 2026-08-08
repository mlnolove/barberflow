import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { updateTenantSettings } from "@/api/settings";
import { applyBrandColors } from "@/lib/theme";
import { useAuthStore } from "@/store/authStore";
import type { Tenant } from "@/types/auth";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

const appearanceSchema = z.object({
  primary_color: z.string().regex(HEX_RE, "Use o formato hexadecimal, ex.: #0F172A"),
  secondary_color: z.string().regex(HEX_RE, "Use o formato hexadecimal, ex.: #0F172A"),
  logo_url: z.string().optional(),
});

type AppearanceFormValues = z.infer<typeof appearanceSchema>;

interface AppearanceTabProps {
  tenant: Tenant;
  canEdit: boolean;
}

export function AppearanceTab({ tenant, canEdit }: AppearanceTabProps) {
  const queryClient = useQueryClient();
  const setTenant = useAuthStore((state) => state.setTenant);
  const [justSaved, setJustSaved] = useState(false);
  const originalColors = useRef({ primary: tenant.primary_color, secondary: tenant.secondary_color });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      primary_color: tenant.primary_color,
      secondary_color: tenant.secondary_color,
      logo_url: tenant.logo_url ?? "",
    },
  });

  const primaryColor = useWatch({ control, name: "primary_color" });
  const secondaryColor = useWatch({ control, name: "secondary_color" });

  useEffect(() => {
    if (HEX_RE.test(primaryColor) && HEX_RE.test(secondaryColor)) {
      applyBrandColors(primaryColor, secondaryColor);
    }
  }, [primaryColor, secondaryColor]);

  useEffect(() => {
    return () => {
      applyBrandColors(originalColors.current.primary, originalColors.current.secondary);
    };
  }, []);

  const mutation = useMutation({
    mutationFn: (values: AppearanceFormValues) =>
      updateTenantSettings({
        primary_color: values.primary_color,
        secondary_color: values.secondary_color,
        logo_url: values.logo_url || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings-tenant"], updated);
      setTenant(updated);
      originalColors.current = { primary: updated.primary_color, secondary: updated.secondary_color };
      applyBrandColors(updated.primary_color, updated.secondary_color);
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
      <p className="text-sm text-slate-500 dark:text-slate-400">
        As cores escolhidas aqui são aplicadas em toda a interface — botões, links ativos e
        destaques. A pré-visualização é aplicada imediatamente, mas só é salva ao confirmar.
      </p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="primary_color" className="block text-sm font-medium">
            Cor primária
          </label>
          <Controller
            control={control}
            name="primary_color"
            render={({ field }) => (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  value={HEX_RE.test(field.value) ? field.value : "#000000"}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-9 w-11 cursor-pointer rounded-md border border-slate-300 disabled:cursor-not-allowed dark:border-slate-700"
                />
                <input
                  disabled={!canEdit}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="#0F172A"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            )}
          />
          {errors.primary_color && (
            <p className="mt-1 text-xs text-red-600">{errors.primary_color.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="secondary_color" className="block text-sm font-medium">
            Cor secundária
          </label>
          <Controller
            control={control}
            name="secondary_color"
            render={({ field }) => (
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  disabled={!canEdit}
                  value={HEX_RE.test(field.value) ? field.value : "#000000"}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="h-9 w-11 cursor-pointer rounded-md border border-slate-300 disabled:cursor-not-allowed dark:border-slate-700"
                />
                <input
                  disabled={!canEdit}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder="#2563EB"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm uppercase disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            )}
          />
          {errors.secondary_color && (
            <p className="mt-1 text-xs text-red-600">{errors.secondary_color.message}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="logo_url" className="block text-sm font-medium">
          URL do logo (opcional)
        </label>
        <input
          id="logo_url"
          disabled={!canEdit}
          placeholder="https://..."
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          {...register("logo_url")}
        />
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Exibido no lugar do nome "BarberFlow" no menu lateral.
        </p>
      </div>

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
