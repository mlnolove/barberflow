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
    return <div className="p-6 text-ink-500">Carregando...</div>;
  }

  if (!product) {
    return <div className="p-6 text-ink-500">Produto não encontrado.</div>;
  }

  return (
    <div className="p-6">
      <Link to="/estoque" className="text-sm text-gold hover:underline">
        ← Voltar para estoque
      </Link>

      <div className="mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-xl font-semibold text-white">{product.name}</h1>
          <p className="text-sm text-ink-500">
            {product.sku && `SKU ${product.sku} · `}
            {product.category ?? "Sem categoria"}
          </p>
        </div>
        {hasPermission("inventory.edit") && (
          <button
            onClick={() => setModal({ kind: "edit" })}
            className="btn-secondary"
          >
            Editar
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
          <p className="text-xs font-medium text-ink-500">Estoque atual</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-white">
            {product.current_quantity}
          </p>
          {product.is_low_stock && (
            <p className="mt-1 text-xs font-medium text-red-400">
              ⚠️ Estoque baixo (mínimo: {product.min_stock})
            </p>
          )}
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
          <p className="text-xs font-medium text-ink-500">Preço de venda</p>
          <p className="mt-1 font-mono text-2xl font-semibold text-gold">
            {formatPrice(product.sale_price)}
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
          <p className="text-xs font-medium text-ink-500">Fornecedor</p>
          <p className="mt-1 text-sm text-white">{product.supplier?.name ?? "—"}</p>
        </div>
      </div>

      {hasPermission("inventory.edit") && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setModal({ kind: "movement", type: "ENTRY" })}
            className="btn-secondary"
          >
            + Adicionar estoque
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "RETURN" })}
            className="btn-secondary"
          >
            Registrar devolução
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "EXIT" })}
            className="btn-secondary"
          >
            − Retirar estoque
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "LOSS" })}
            className="btn-secondary"
          >
            Registrar perda
          </button>
          <button
            onClick={() => setModal({ kind: "movement", type: "SALE" })}
            className="btn-secondary"
          >
            Registrar venda
          </button>
          {hasPermission("inventory.adjust") && (
            <button
              onClick={() => setModal({ kind: "adjust" })}
              className="rounded-md border border-amber-800/40 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-950/40"
            >
              Ajustar estoque
            </button>
          )}
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-ink-500">Histórico de movimentações</h2>
      <div className="table-card mt-2">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
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
                <td colSpan={6} className="px-4 py-6 text-center text-ink-500">
                  Nenhuma movimentação registrada.
                </td>
              </tr>
            )}
            {movements?.items.map((m) => (
              <tr key={m.id} className="border-t border-white/[0.05] text-white">
                <td className="px-4 py-2">{formatDateTime(m.created_at)}</td>
                <td className="px-4 py-2">{MOVEMENT_LABELS[m.type]}</td>
                <td className="px-4 py-2">{m.quantity_before}</td>
                <td className="px-4 py-2">
                  {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                </td>
                <td className="px-4 py-2">{m.quantity_after}</td>
                <td className="px-4 py-2 text-ink-500">{m.reason}</td>
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
