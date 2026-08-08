import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { getSummary, listPaymentMethods, listTransactions, setPaymentMethodActive } from "@/api/financial";
import { TransactionFormModal } from "@/components/financial/TransactionFormModal";
import { VoidTransactionModal } from "@/components/financial/VoidTransactionModal";
import { useAuthStore } from "@/store/authStore";
import type { FinancialTransaction, TransactionType } from "@/types/financial";

const LIMIT = 20;

function formatMoney(value: string): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR");
}

function firstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function FinancialPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [type, setType] = useState<TransactionType | "">("");
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [voidingTransaction, setVoidingTransaction] = useState<FinancialTransaction | null>(null);

  const { data: summary } = useQuery({
    queryKey: ["financial-summary", dateFrom, dateTo],
    queryFn: () => getSummary(dateFrom, dateTo),
  });

  const { data: transactions, isLoading, isError } = useQuery({
    queryKey: ["financial-transactions", { dateFrom, dateTo, type, page }],
    queryFn: () =>
      listTransactions({
        date_from: dateFrom,
        date_to: dateTo,
        type: type || undefined,
        page,
        limit: LIMIT,
      }),
  });

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: listPaymentMethods,
  });

  const toggleMethodMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setPaymentMethodActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-methods"] }),
  });

  const totalPages = transactions ? Math.max(1, Math.ceil(transactions.total / LIMIT)) : 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Financeiro</h1>
        {hasPermission("finance.create") && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Novo lançamento
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Entradas</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
            {summary ? formatMoney(summary.total_income) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saídas</p>
          <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
            {summary ? formatMoney(summary.total_expense) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Saldo do período</p>
          <p className="mt-1 text-2xl font-semibold">{summary ? formatMoney(summary.balance) : "—"}</p>
        </div>
      </div>

      {paymentMethods && paymentMethods.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Formas de pagamento:
          </span>
          {paymentMethods.map((m) => (
            <button
              key={m.id}
              disabled={!hasPermission("finance.edit")}
              onClick={() => toggleMethodMutation.mutate({ id: m.id, isActive: !m.is_active })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                m.is_active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "border-slate-300 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800"
              }`}
            >
              {m.name} {m.is_active ? "✓" : "desativado"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <span className="text-sm text-slate-400">até</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value as TransactionType | "");
            setPage(1);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Todos os tipos</option>
          <option value="INCOME">Entradas</option>
          <option value="EXPENSE">Saídas</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Forma de pagamento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  Não foi possível carregar os lançamentos.
                </td>
              </tr>
            )}
            {transactions && transactions.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nenhum lançamento no período.
                </td>
              </tr>
            )}
            {transactions?.items.map((t) => (
              <tr key={t.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3">{formatDate(t.transaction_date)}</td>
                <td className="px-4 py-3">
                  {t.description}
                  {t.is_voided && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      Estornado
                    </span>
                  )}
                  {t.reversal_of_id && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      Estorno
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{t.category}</td>
                <td className="px-4 py-3">{t.payment_method.name}</td>
                <td
                  className={`px-4 py-3 font-medium ${
                    t.type === "INCOME"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {t.type === "INCOME" ? "+" : "−"} {formatMoney(t.amount)}
                </td>
                <td className="px-4 py-3">
                  {hasPermission("finance.edit") && !t.is_voided && !t.reversal_of_id && (
                    <button
                      onClick={() => setVoidingTransaction(t)}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                      Estornar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions && transactions.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            {transactions.total} lançamento{transactions.total !== 1 ? "s" : ""} — página {page} de{" "}
            {totalPages}
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
