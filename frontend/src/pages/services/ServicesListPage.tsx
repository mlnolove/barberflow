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
        <h1 className="text-xl font-semibold">Serviços</h1>
        {hasPermission("services.create") && (
          <button
            onClick={openCreate}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
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
          className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-slate-500">Carregando...</p>}
        {isError && <p className="text-red-600">Não foi possível carregar os serviços.</p>}
        {data && data.items.length === 0 && (
          <p className="text-slate-500">Nenhum serviço encontrado.</p>
        )}
        {data?.items.map((service) => (
          <div
            key={service.id}
            className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{service.name}</h3>
                {service.category && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{service.category}</p>
                )}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  service.is_active
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {service.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <p className="mt-3 text-lg font-semibold">{formatPrice(service.price)}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {service.duration_minutes} minutos
            </p>

            {hasPermission("services.edit") && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => openEdit(service)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Editar
                </button>
                {hasPermission("services.delete") && (
                  <button
                    onClick={() => toggleStatusMutation.mutate(service)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    {service.is_active ? "Desativar" : "Reativar"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            {data.total} serviço{data.total !== 1 ? "s" : ""} — página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40 dark:border-slate-700"
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
