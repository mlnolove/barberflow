import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { listCustomers } from "@/api/customers";
import { CustomerFormModal } from "@/components/customers/CustomerFormModal";
import { useAuthStore } from "@/store/authStore";

const LIMIT = 20;

type StatusFilter = "all" | "active" | "inactive";

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
        {hasPermission("clients.create") && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            Novo cliente
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
          placeholder="Buscar por nome, telefone ou e-mail"
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

      <div className="table-card mt-4">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-500">
                  Carregando...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-400">
                  Não foi possível carregar os clientes.
                </td>
              </tr>
            )}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {data?.items.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => navigate(`/clientes/${customer.id}`)}
                className="table-row text-white"
              >
                <td className="px-4 py-3 font-medium">{customer.full_name}</td>
                <td className="px-4 py-3">{customer.phone}</td>
                <td className="px-4 py-3">{customer.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={customer.is_active ? "badge-active" : "badge-inactive"}>
                    {customer.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>
            {data.total} cliente{data.total !== 1 ? "s" : ""} — página {page} de {totalPages}
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

      {showCreateModal && (
        <CustomerFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(customer) => navigate(`/clientes/${customer.id}`)}
        />
      )}
    </div>
  );
}
