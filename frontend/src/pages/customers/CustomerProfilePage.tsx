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
    return <div className="p-6 text-ink-500">Carregando...</div>;
  }

  if (!customer) {
    return <div className="p-6 text-ink-500">Cliente não encontrado.</div>;
  }

  return (
    <div className="p-6">
      <Link to="/clientes" className="text-sm text-gold hover:underline">
        ← Voltar para clientes
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-white">{customer.full_name}</h1>
          <span className={`mt-1 inline-block ${customer.is_active ? "badge-active" : "badge-inactive"}`}>
            {customer.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>

        {hasPermission("clients.edit") && (
          <div className="flex gap-2">
            <button onClick={() => setShowEditModal(true)} className="btn-secondary">
              Editar
            </button>
            {hasPermission("clients.delete") && (
              <button
                onClick={() => toggleStatusMutation.mutate()}
                disabled={toggleStatusMutation.isPending}
                className="btn-secondary"
              >
                {customer.is_active ? "Desativar" : "Reativar"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
          <p className="text-xs font-medium text-ink-500">Telefone</p>
          <p className="mt-1 text-sm text-white">{customer.phone}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
          <p className="text-xs font-medium text-ink-500">E-mail</p>
          <p className="mt-1 text-sm text-white">{customer.email ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
          <p className="text-xs font-medium text-ink-500">Data de nascimento</p>
          <p className="mt-1 text-sm text-white">{formatDate(customer.birth_date)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
          <p className="text-xs font-medium text-ink-500">Cliente desde</p>
          <p className="mt-1 text-sm text-white">{formatDate(customer.created_at)}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4 sm:col-span-2">
          <p className="text-xs font-medium text-ink-500">Endereço</p>
          <p className="mt-1 text-sm text-white">{customer.address ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4 sm:col-span-2">
          <p className="text-xs font-medium text-ink-500">Observações</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-white">{customer.notes ?? "—"}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-white/[0.1] p-8 text-center text-sm text-ink-500">
        Histórico de atendimentos, valor total gasto e serviço mais utilizado estarão disponíveis
        a partir da Fase 4 (Agenda) e Fase 6 (Financeiro) do roadmap.
      </div>

      {showEditModal && (
        <CustomerFormModal customer={customer} onClose={() => setShowEditModal(false)} />
      )}
    </div>
  );
}
