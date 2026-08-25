import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";

import { getSummary, listPaymentMethods, listTransactions, setPaymentMethodActive } from "@/api/financial";
import { TransactionFormModal } from "@/components/financial/TransactionFormModal";
import { VoidTransactionModal } from "@/components/financial/VoidTransactionModal";
import { useAuthStore } from "@/store/authStore";
import type { FinancialTransaction, TransactionType } from "@/types/financial";

const LIMIT = 20;
const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatMoney(value: string): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function firstDayOfMonth(): string {
  const now = new Date();
  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}

function today(): string {
  return toDateInput(new Date());
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateInput(d);
}

type Preset = "7d" | "30d" | "month" | "custom";

export function FinancialPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [preset, setPreset] = useState<Preset>("month");
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [type, setType] = useState<TransactionType | "">("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [voidingTransaction, setVoidingTransaction] = useState<FinancialTransaction | null>(null);

  function applyPreset(p: Preset) {
    setPreset(p);
    setPage(1);
    if (p === "7d") {
      setDateFrom(daysAgo(6));
      setDateTo(today());
    } else if (p === "30d") {
      setDateFrom(daysAgo(29));
      setDateTo(today());
    } else if (p === "month") {
      setDateFrom(firstDayOfMonth());
      setDateTo(today());
    }
  }

  const { data: summary } = useQuery({
    queryKey: ["financial-summary", dateFrom, dateTo],
    queryFn: () => getSummary(dateFrom, dateTo),
  });

  const { data: transactions, isLoading, isError } = useQuery({
    queryKey: ["financial-transactions", { dateFrom, dateTo, type, paymentMethodFilter, page }],
    queryFn: () =>
      listTransactions({
        date_from: dateFrom,
        date_to: dateTo,
        type: type || undefined,
        payment_method_id: paymentMethodFilter || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: listPaymentMethods,
  });
  const activeMethods = paymentMethods?.filter((m) => m.is_active) ?? [];

  const toggleMethodMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setPaymentMethodActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-methods"] }),
  });

  const totalPages = transactions ? Math.max(1, Math.ceil(transactions.total / LIMIT)) : 1;

  const income = summary ? Number(summary.total_income) : 0;
  const expense = summary ? Number(summary.total_expense) : 0;
  const marginPct = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const ringOffset = RING_CIRCUMFERENCE - RING_CIRCUMFERENCE * (Math.max(marginPct, 0) / 100);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-white">Financeiro</h1>
        {hasPermission("finance.create") && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} strokeWidth={2.5} />
            Novo lançamento
          </button>
        )}
      </div>

      {/* Hero: anel de margem + resumo entradas/saídas/saldo */}
      <div className="animate-rise-in mt-4 flex items-center gap-5 rounded-2xl border border-white/[0.06] bg-ink-900 p-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
            <circle cx="48" cy="48" r={RING_RADIUS} fill="none" stroke="#222220" strokeWidth="9" />
            <circle
              cx="48"
              cy="48"
              r={RING_RADIUS}
              fill="none"
              stroke="#C8A65E"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-base font-bold text-white">{marginPct}%</span>
            <span className="text-[9px] text-ink-600">margem</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs text-ink-300">Entradas</span>
            </div>
            <span className="font-mono text-sm font-semibold text-emerald-400">
              {summary ? formatMoney(summary.total_income) : "—"}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-red-400" />
              <span className="text-xs text-ink-300">Saídas</span>
            </div>
            <span className="font-mono text-sm font-semibold text-red-400">
              {summary ? formatMoney(summary.total_expense) : "—"}
            </span>
          </div>
          <div className="my-2 h-px bg-white/[0.06]" />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-300">Saldo</span>
            <span className="font-mono text-sm font-bold text-white">
              {summary ? formatMoney(summary.balance) : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Período: atalhos rápidos + datas customizadas */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-white/[0.08] bg-ink-900 p-1">
          {(
            [
              ["7d", "7 dias"],
              ["30d", "30 dias"],
              ["month", "Este mês"],
            ] as [Preset, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === key ? "bg-gold text-ink-950" : "text-ink-400 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPreset("custom");
            setPage(1);
          }}
          className="rounded-md border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white"
        />
        <span className="text-sm text-ink-600">até</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPreset("custom");
            setPage(1);
          }}
          className="rounded-md border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white"
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as TransactionType | "");
            setPage(1);
          }}
          className="rounded-md border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white"
        >
          <option value="">Todos os tipos</option>
          <option value="INCOME">Entradas</option>
          <option value="EXPENSE">Saídas</option>
        </select>
      </div>

      {/* Filtro por forma de pagamento */}
      {activeMethods.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
            Filtrar por forma de pagamento
          </p>
          <div className="flex flex-wrap gap-2">
            {activeMethods.map((m) => {
              const active = paymentMethodFilter === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setPaymentMethodFilter(active ? null : m.id);
                    setPage(1);
                  }}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    active ? "border-gold bg-gold text-ink-950" : "border-white/[0.08] text-ink-300"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lançamentos */}
      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Lançamentos</h3>
        {transactions && <span className="text-xs text-ink-500">{transactions.total} no período</span>}
      </div>
      <div className="table-card mt-2">
        {isLoading && <p className="px-4 py-8 text-center text-sm text-ink-500">Carregando...</p>}
        {isError && (
          <p className="px-4 py-8 text-center text-sm text-red-400">Não foi possível carregar os lançamentos.</p>
        )}
        {transactions && transactions.items.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-500">Nenhum lançamento no período.</p>
        )}
        {transactions && transactions.items.length > 0 && (
          <div className="divide-y divide-white/[0.05]">
            {transactions.items.map((t, index) => {
              const isIncome = t.type === "INCOME";
              return (
                <div
                  key={t.id}
                  style={{ animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                  className="animate-row-in flex items-center gap-3 px-4 py-3.5"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isIncome ? "bg-emerald-500/[0.12]" : "bg-red-500/[0.12]"
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight size={16} className="text-emerald-400" strokeWidth={2.25} />
                    ) : (
                      <ArrowDownLeft size={16} className="text-red-400" strokeWidth={2.25} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-white">{t.description}</p>
                      {t.is_voided && (
                        <span className="shrink-0 rounded-full bg-ink-800 px-2 py-0.5 text-[10px] text-ink-400">
                          Estornado
                        </span>
                      )}
                      {t.reversal_of_id && (
                        <span className="shrink-0 rounded-full bg-amber-950/40 px-2 py-0.5 text-[10px] text-amber-300">
                          Estorno
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {formatDate(t.transaction_date)} · {t.category} · {t.payment_method.name}
                    </p>
                  </div>
                  <span className={`shrink-0 font-mono text-sm font-semibold ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                    {isIncome ? "+" : "−"} {formatMoney(t.amount)}
                  </span>
                  {hasPermission("finance.edit") && !t.is_voided && !t.reversal_of_id && (
                    <button
                      onClick={() => setVoidingTransaction(t)}
                      className="shrink-0 rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
                    >
                      Estornar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {transactions && transactions.total > 0 && (
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

      {/* Formas de pagamento aceitas (config da barbearia) */}
      {paymentMethods && paymentMethods.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-600">
            Formas de pagamento aceitas
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {paymentMethods.map((m) => (
              <button
                key={m.id}
                disabled={!hasPermission("finance.edit")}
                onClick={() => toggleMethodMutation.mutate({ id: m.id, isActive: !m.is_active })}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  m.is_active
                    ? "border-emerald-800/40 bg-emerald-950/30 text-emerald-300"
                    : "border-white/[0.08] bg-ink-900 text-ink-600"
                }`}
              >
                {m.name} {m.is_active ? "✓" : "desativado"}
              </button>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && <TransactionFormModal onClose={() => setShowCreateModal(false)} />}
      {voidingTransaction && (
        <VoidTransactionModal
          transaction={voidingTransaction}
          onClose={() => setVoidingTransaction(null)}
        />
      )}
    </div>
  );
}
