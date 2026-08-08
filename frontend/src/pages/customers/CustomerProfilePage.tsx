import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { deactivateCustomer, getCustomer, reactivateCustomer } from "@/api/customers";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { useAuthStore } from "@/store/authStore";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customers", id],
    queryFn: () => getCustomer(id!),
    enabled: Boolean(id),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      customer!.is_active ? deactivateCustomer(customer!.id) : reactivateCustomer(customer!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });

  if (isLoading) {
    return <div className="p-6 text-slate-500">Carregando...</div>;
  }

  if (!customer) {
    return <div className="p-6 text-slate-500">Cliente não encontrado.</div>;
  }

  return (
    <div className="p-6">
      <Link to="/clientes" className="text-sm text-brand-secondary hover:underline">
        ← Voltar para clientes
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{customer.full_name}</h1>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              customer.is_active
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {customer.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>

        {hasPermission("clients.edit") && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Editar
            </button>
            {hasPermission("clients.delete") && (
              <button
                onClick={() => toggleStatusMutation.mutate()}
                disabled={toggleStatusMutation.isPending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {customer.is_active ? "Desativar" : "Reativar"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Telefone</p>
          <p className="mt-1 text-sm">{customer.phone}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">E-mail</p>
          <p className="mt-1 text-sm">{customer.email ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Data de nascimento
          </p>
          <p className="mt-1 text-sm">{formatDate(customer.birth_date)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Cliente desde</p>
          <p className="mt-1 text-sm">{formatDate(customer.created_at)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:col-span-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Endereço</p>
          <p className="mt-1 text-sm">{customer.address ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 sm:col-span-2">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Observações</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{customer.notes ?? "—"}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Histórico de atendimentos, valor total gasto e serviço mais utilizado estarão disponíveis
        a partir da Fase 4 (Agenda) e Fase 6 (Financeiro) do roadmap.
      </div>

      {showEditModal && (
        <CustomerFormModal customer={customer} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
}
