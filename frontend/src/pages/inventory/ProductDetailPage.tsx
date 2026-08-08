import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getProduct, listMovements } from "@/api/inventory";
import { AdjustmentModal } from "@/components/inventory/AdjustmentModal";
import { ProductFormModal } from "@/components/inventory/ProductFormModal";
import { StockMovementModal } from "@/components/inventory/StockMovementModal";
import { useAuthStore } from "@/store/authStore";
import type { ManualMovementType, MovementType } from "@/types/product";

const MOVEMENT_LABELS: Record<MovementType, string> = {
  ENTRY: "Entrada",
  EXIT: "Saída",
  ADJUSTMENT: "Ajuste",
  LOSS: "Perda",
  SALE: "Venda",
  RETURN: "Devolução",
};

function formatPrice(price: string): string {
  return Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ModalState = { kind: "movement"; type: ManualMovementType } | { kind: "adjust" } | { kind: "edit" } | null;

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [modal, setModal] = useState<ModalState>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ["products", id],
    queryFn: () => getProduct(id!),
    enabled: Boolean(id),
  });

  const { data: movements } = useQuery({
    queryKey: ["movements", id],
    queryFn: () => listMovements(id!, { limit: 50 }),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <div className="p-6 text-slate-500">Carregando...</div>;
  }

  if (!product) {
    return <div className="p-6 text-slate-500">Produto não encontrado.</div>;
  }

  return (
    <div className="p-6">
      <Link to="/estoque" className="text-sm text-brand-secondary hover:underline">
        ← Voltar para estoque
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{product.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {product.sku && `SKU ${product.sku} · `}
            {product.category ?? "Sem categoria"}
          </p>
        </div>
        {hasPermission("inventory.edit") && (
          <button
            onClick={() => setModal({ kind: "edit" })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Editar
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Estoque atual</p>
          <p className="mt-1 text-2xl font-semibold">{product.current_quantity}</p>
          {product.is_low_stock && (
            <p className="mt-1 text-xs font-medium text-red-600">
              ⚠️ Estoque baixo (mínimo: {product.min_stock})
            </p>
          )}
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Preço de venda</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(product.sale_price)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Fornecedor</p>
          <p className="mt-1 text-sm">{product.supplier?.name ?? "—"}</p>
        </div>
      </div>

      {hasPermission("inventory.edit") && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setModal({ kind: "movement", type: "ENTRY" })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            + Adicionar estoque
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "RETURN" })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Registrar devolução
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "EXIT" })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            − Retirar estoque
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "LOSS" })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Registrar perda
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "SALE" })}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Registrar venda
          </button>
          {hasPermission("inventory.adjust") && (
            <button
              onClick={() => setModal({ kind: "adjust" })}
              className="rounded-md border border-amber-300 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
            >
              Ajustar estoque
            </button>
          )}
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
        Histórico de movimentações
      </h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Antes</th>
              <th className="px-4 py-2 font-medium">Movimentação</th>
              <th className="px-4 py-2 font-medium">Depois</th>
              <th className="px-4 py-2 font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {movements?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nenhuma movimentação registrada.
                </td>
              </tr>
            )}
            {movements?.items.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2">{formatDateTime(m.created_at)}</td>
                <td className="px-4 py-2">{MOVEMENT_LABELS[m.type]}</td>
                <td className="px-4 py-2">{m.quantity_before}</td>
                <td className="px-4 py-2">
                  {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                </td>
                <td className="px-4 py-2">{m.quantity_after}</td>
                <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal?.kind === "movement" && (
        <StockMovementModal product={product} type={modal.type} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "adjust" && (
        <AdjustmentModal product={product} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "edit" && (
        <ProductFormModal product={product} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
