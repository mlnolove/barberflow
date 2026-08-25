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
        <h1 className="font-serif text-xl font-semibold text-white">Estoque</h1>
        <div className="flex gap-2">
          <Link to="/estoque/fornecedores" className="btn-secondary">
            Fornecedores
          </Link>
          {hasPermission("inventory.create") && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
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
        <label className="flex items-center gap-2 text-sm text-ink-300">
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

      <div className="table-card mt-4">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
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
                <td colSpan={5} className="px-4 py-6 text-center text-ink-500">
                  Carregando...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-400">
                  Não foi possível carregar os produtos.
                </td>
              </tr>
            )}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-500">
                  Nenhum produto encontrado.
                </td>
              </tr>
            )}
            {data?.items.map((product) => (
              <tr
                key={product.id}
                onClick={() => navigate(`/estoque/${product.id}`)}
                className="table-row text-white"
              >
                <td className="px-4 py-3 font-medium">
                  {product.name}
                  {product.sku && <span className="ml-2 text-xs text-ink-600">{product.sku}</span>}
                </td>
                <td className="px-4 py-3">{product.category ?? "—"}</td>
                <td className="px-4 py-3">
                  {product.current_quantity}
                  {product.is_low_stock && (
                    <span className="ml-2 rounded-full bg-red-950/40 px-2 py-0.5 text-xs font-medium text-red-300">
                      ⚠️ Baixo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{formatPrice(product.sale_price)}</td>
                <td className="px-4 py-3">
                  <span className={product.is_active ? "badge-active" : "badge-inactive"}>
                    {product.is_active ? "Ativo" : "Inativo"}
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
            {data.total} produto{data.total !== 1 ? "s" : ""} — página {page} de {totalPages}
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
        <ProductFormModal
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
