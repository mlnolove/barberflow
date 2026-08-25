import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deactivateService, listServices, reactivateService } from "@/api/services";
import { ServiceFormModal } from "@/components/services/ServiceFormModal";
import { useAuthStore } from "@/store/authStore";
import type { Service } from "@/types/service";

const LIMIT = 20;

type StatusFilter = "all" | "active" | "inactive";

function formatPrice(price: string): string {
  return Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ServicesListPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["services", { search, status, page }],
    queryFn: () =>
      listServices({
        q: search || undefined,
        is_active: status === "all" ? undefined : status === "active",
        page,
        limit: LIMIT,
      }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (service: Service) =>
      service.is_active ? deactivateService(service.id) : reactivateService(service.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["services"] }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  function openCreate() {
    setEditingService(undefined);
    setShowModal(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setShowModal(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-white">Serviços</h1>
        {hasPermission("services.create") && (
          <button onClick={openCreate} className="btn-primary">
            Novo serviço
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome ou categoria"
          className="w-72 rounded-md border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-ink-600"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="rounded-md border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-ink-500">Carregando...</p>}
        {isError && <p className="text-red-400">Não foi possível carregar os serviços.</p>}
        {data && data.items.length === 0 && <p className="text-ink-500">Nenhum serviço encontrado.</p>}
        {data?.items.map((service) => (
          <div key={service.id} className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{service.name}</h3>
                {service.category && <p className="text-xs text-ink-500">{service.category}</p>}
              </div>
              <span className={service.is_active ? "badge-active" : "badge-inactive"}>
                {service.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <p className="mt-3 font-mono text-lg font-semibold text-gold">
              {formatPrice(service.price)}
            </p>
            <p className="text-sm text-ink-500">{service.duration_minutes} minutos</p>

            {hasPermission("services.edit") && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(service)} className="btn-secondary">
                  Editar
                </button>
                {hasPermission("services.delete") && (
                  <button onClick={() => toggleStatusMutation.mutate(service)} className="btn-secondary">
                    {service.is_active ? "Desativar" : "Reativar"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>
            {data.total} serviço{data.total !== 1 ? "s" : ""} — página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-white/[0.08] px-3 py-1 text-ink-300 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-white/[0.08] px-3 py-1 text-ink-300 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <ServiceFormModal service={editingService} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
