import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Search, Smartphone } from "lucide-react";

import { listCustomers } from "@/api/customers";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { FabButton } from "@/components/FabButton";
import { useAuthStore } from "@/store/authStore";
import type { Customer } from "@/types/customer";

const LIMIT = 20;

type StatusFilter = "all" | "active" | "inactive";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "active", label: "Ativos" },
  { key: "inactive", label: "Inativos" },
  { key: "all", label: "Todos" },
];

const AVATAR_STYLES = [
  "bg-gold/[0.12] text-gold",
  "bg-blue-500/[0.12] text-blue-400",
  "bg-emerald-500/[0.12] text-emerald-400",
  "bg-pink-500/[0.12] text-pink-400",
];

function avatarStyle(name: string): string {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_STYLES[hash % AVATAR_STYLES.length];
}

export function CustomersListPage() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customers", { search, status, page }],
    queryFn: () =>
      listCustomers({
        q: search || undefined,
        is_active: status === "all" ? undefined : status === "active",
        page,
        limit: LIMIT,
      }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-white">Clientes</h1>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex h-10 w-full max-w-xs items-center gap-2 rounded-xl border border-white/[0.08] bg-ink-900 px-3.5">
          <Search size={14} className="shrink-0 text-ink-600" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por nome, telefone ou e-mail"
            className="w-full bg-transparent text-sm text-white placeholder:text-ink-600"
          />
        </div>
        <div className="flex rounded-xl border border-white/[0.08] bg-ink-900 p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setStatus(f.key);
                setPage(1);
              }}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors ${
                status === f.key ? "bg-gold text-ink-950" : "text-ink-400 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {data && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-600">
            {data.total} cliente{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="table-card mt-2">
        {isLoading && <p className="px-4 py-8 text-center text-sm text-ink-500">Carregando...</p>}
        {isError && (
          <p className="px-4 py-8 text-center text-sm text-red-400">Não foi possível carregar os clientes.</p>
        )}
        {data && data.items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-500">Nenhum cliente encontrado.</p>
        )}
        {data && data.items.length > 0 && (
          <div className="divide-y divide-white/[0.05]">
            {data.items.map((customer: Customer, index) => (
              <button
                key={customer.id}
                onClick={() => navigate(`/clientes/${customer.id}`)}
                style={{ animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                className="animate-row-in flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-ink-800/40"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-serif text-sm font-semibold ${avatarStyle(customer.full_name)}`}
                >
                  {customer.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-white">{customer.full_name}</p>
                    {customer.client_account_id && (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-gold/[0.1] px-1.5 py-0.5">
                        <Smartphone size={8} className="text-gold" strokeWidth={2.5} />
                        <span className="text-[8px] font-semibold text-gold">app</span>
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-ink-500">
                    {customer.phone}
                    {customer.email && ` · ${customer.email}`}
                  </p>
                </div>
                <span className={customer.is_active ? "badge-active" : "badge-inactive"}>
                  {customer.is_active ? "Ativo" : "Inativo"}
                </span>
                <ChevronRight size={15} className="shrink-0 text-ink-700" />
              </button>
            ))}
          </div>
        )}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>
            página {page} de {totalPages}
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

      {hasPermission("clients.create") && (
        <FabButton label="Novo cliente" onClick={() => setShowCreateModal(true)} />
      )}

      {showCreateModal && (
        <CustomerFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(customer) => navigate(`/clientes/${customer.id}`)}
        />
      )}
    </div>
  );
}
