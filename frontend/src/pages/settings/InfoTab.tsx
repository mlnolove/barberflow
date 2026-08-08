import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { updateTenantSettings } from "@/api/settings";
import type { Tenant } from "@/types/auth";
import { useAuthStore } from "@/store/authStore";

const infoSchema = z.object({
  name: z.string().min(2, "Informe o nome da barbearia"),
  phone: z.string().optional(),
  email: z.union([z.string().email("E-mail inválido"), z.literal("")]).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

type InfoFormValues = z.infer<typeof infoSchema>;

interface InfoTabProps {
  tenant: Tenant;
  canEdit: boolean;
}

export function InfoTab({ tenant, canEdit }: InfoTabProps) {
  const queryClient = useQueryClient();
  const setTenant = useAuthStore((state) => state.setTenant);
  const [justSaved, setJustSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InfoFormValues>({
    resolver: zodResolver(infoSchema),
    defaultValues: {
      name: tenant.name,
      phone: tenant.phone ?? "",
      email: tenant.email ?? "",
      address: tenant.address ?? "",
      city: tenant.city ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: (values: InfoFormValues) =>
      updateTenantSettings({
        name: values.name,
        phone: values.phone || null,
        email: values.email || null,
        address: values.address || null,
        city: values.city || null,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings-tenant"], updated);
      setTenant(updated);
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
      className="max-w-xl space-y-4"
      onSubmit={handleSubmit((v) => mutation.mutate(v))}
      noValidate
    >
      <div>
        <label htmlFor="name" className="block text-sm font-medium">
          Nome da barbearia
        </label>
        <input
          id="name"
          disabled={!canEdit}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          {...register("name")}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium">
            Telefone
          </label>
          <input
            id="phone"
            disabled={!canEdit}
            placeholder="(11) 98765-4321"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
            {...register("phone")}
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            E-mail de contato
          </label>
          <input
            id="email"
            disabled={!canEdit}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
            {...register("email")}
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="address" className="block text-sm font-medium">
          Endereço
        </label>
        <input
          id="address"
          disabled={!canEdit}
          placeholder="Rua, número, bairro"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          {...register("address")}
        />
      </div>

      <div>
        <label htmlFor="city" className="block text-sm font-medium">
          Cidade
        </label>
        <input
          id="city"
          disabled={!canEdit}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          {...register("city")}
        />
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
