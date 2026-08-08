import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { listProducts } from "@/api/inventory";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { useAuthStore } from "@/store/authStore";

const LIMIT = 20;

type StatusFilter = "all" | "active" | "inactive";

function formatPrice(price: string): string {
  return Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductsListPage() {
  const navigate = useNavigate();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", { search, status, lowStockOnly, page }],
    queryFn: () =>
      listProducts({
        q: search || undefined,
        is_active: status === "all" ? undefined : status === "active",
        low_stock: lowStockOnly || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Estoque</h1>
        <div className="flex gap-2">
          <Link
            to="/estoque/fornecedores"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Fornecedores
          </Link>
          {hasPermission("inventory.create") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Novo produto
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome, SKU ou categoria"
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
          />
          Só estoque baixo
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Estoque</th>
              <th className="px-4 py-3 font-medium">Preço de venda</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  Não foi possível carregar os produtos.
                </td>
              </tr>
            )}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {data?.items.map((product) => (
              <tr
                key={product.id}
                onClick={() => navigate(`/estoque/${product.id}`)}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
              >
                <td className="px-4 py-3 font-medium">
                  {product.name}
                  {product.sku && (
                    <span className="ml-2 text-xs text-slate-400">{product.sku}</span>
                  )}
                </td>
                <td className="px-4 py-3">{product.category ?? "—"}</td>
                <td className="px-4 py-3">
                  {product.current_quantity}
                  {product.is_low_stock && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      ⚠️ Baixo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatPrice(product.sale_price)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      product.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {product.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            {data.total} produto{data.total !== 1 ? "s" : ""} — página {page} de {totalPages}
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

      {showCreateModal && (
        <ProductFormModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
