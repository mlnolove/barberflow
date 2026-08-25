import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { listPayments } from "@/api/payments";
import { cancelSubscription, createSubscriptionCheckout, getSubscription } from "@/api/subscription";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import type { SubscriptionStatus } from "@/types/subscription";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Período de teste",
  ACTIVE: "Ativa",
  PAST_DUE: "Pagamento pendente",
  CANCELLED: "Cancelada",
  EXPIRED: "Expirada",
};

const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  TRIAL: "bg-amber-950/40 text-amber-300",
  ACTIVE: "bg-emerald-950/40 text-emerald-300",
  PAST_DUE: "bg-amber-950/40 text-amber-300",
  CANCELLED: "bg-ink-800 text-ink-400",
  EXPIRED: "bg-red-950/40 text-red-300",
};

const BILLING_INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "mensal",
  ANNUAL: "anual",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  FAILED: "Falhou",
  REFUNDED: "Reembolsado",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
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

export function SubscriptionTab({ canEdit }: { canEdit: boolean }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [justActivated, setJustActivated] = useState(false);

  const { data: subscription, isLoading, isError } = useQuery({
    queryKey: ["settings-subscription"],
    queryFn: getSubscription,
  });

  const canViewPayments = hasPermission("finance.view");
  const { data: payments } = useQuery({
    queryKey: ["settings-subscription-payments"],
    queryFn: () => listPayments(1, 10),
    enabled: canViewPayments,
  });
  const subscriptionPayments = payments?.items.filter((p) => p.purpose === "SUBSCRIPTION") ?? [];

  const checkoutMutation = useMutation({
    mutationFn: createSubscriptionCheckout,
    onSuccess: (checkout) => {
      setActionError(null);
      if (checkout.checkout_url) {
        window.location.href = checkout.checkout_url;
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["settings-subscription"] });
      queryClient.invalidateQueries({ queryKey: ["settings-subscription-payments"] });
      setJustActivated(true);
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setActionError(message ?? "Não foi possível iniciar o pagamento.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      setActionError(null);
      setConfirmingCancel(false);
      queryClient.invalidateQueries({ queryKey: ["settings-subscription"] });
    },
    onError: (error: unknown) => {
      const message = isAxiosError(error)
        ? (error.response?.data?.detail as string | undefined)
        : undefined;
      setActionError(message ?? "Não foi possível cancelar a assinatura.");
      setConfirmingCancel(false);
    },
  });

  useEffect(() => {
    if (!justActivated) return;
    const timeout = setTimeout(() => setJustActivated(false), 3000);
    return () => clearTimeout(timeout);
  }, [justActivated]);

  if (isLoading) {
    return <p className="text-sm text-ink-500">Carregando...</p>;
  }

  if (isError || !subscription) {
    return <p className="text-sm text-red-400">Não foi possível carregar a assinatura.</p>;
  }

  const willNotRenew = subscription.status === "ACTIVE" && subscription.cancel_at_period_end;
  const isUsable = subscription.status === "TRIAL" || subscription.status === "ACTIVE";

  return (
    <div className="max-w-xl">
      <div className="rounded-xl border border-white/[0.06] bg-ink-900 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-ink-500">Plano atual</p>
            <h3 className="mt-1 font-serif text-lg font-semibold text-white">{subscription.plan.name}</h3>
            <p className="mt-1 font-mono text-sm text-gold">
              {formatMoney(subscription.plan.price)}
              <span className="text-ink-500"> / {BILLING_INTERVAL_LABELS[subscription.plan.billing_interval]}</span>
            </p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[subscription.status]}`}>
            {STATUS_LABELS[subscription.status]}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/[0.05] pt-4 text-sm">
          <div>
            <p className="text-xs text-ink-500">
              {subscription.status === "TRIAL" ? "Teste termina em" : "Período atual até"}
            </p>
            <p className="mt-0.5 text-white">{formatDate(subscription.current_period_end)}</p>
          </div>
          {subscription.cancelled_at && (
            <div>
              <p className="text-xs text-ink-500">Cancelada em</p>
              <p className="mt-0.5 text-white">{formatDate(subscription.cancelled_at)}</p>
            </div>
          )}
        </div>

        {willNotRenew && (
          <p className="mt-4 rounded-lg bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
            Sua assinatura não será renovada e fica ativa até {formatDate(subscription.current_period_end)}.
          </p>
        )}

        {actionError && <p className="mt-4 text-sm text-red-400">{actionError}</p>}

        {canEdit && (
          <div className="mt-5 flex flex-wrap gap-2">
            {!isUsable && (
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="btn-primary"
              >
                {checkoutMutation.isPending ? "Processando..." : "Assinar agora"}
              </button>
            )}
            {willNotRenew && (
              <button
                onClick={() => checkoutMutation.mutate()}
                disabled={checkoutMutation.isPending}
                className="btn-primary"
              >
                {checkoutMutation.isPending ? "Processando..." : "Manter assinatura ativa"}
              </button>
            )}
            {isUsable && !willNotRenew && !confirmingCancel && (
              <button onClick={() => setConfirmingCancel(true)} className="btn-secondary">
                Cancelar assinatura
              </button>
            )}
            {confirmingCancel && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-ink-300">Tem certeza?</span>
                <button
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {cancelMutation.isPending ? "Cancelando..." : "Sim, cancelar"}
                </button>
                <button onClick={() => setConfirmingCancel(false)} className="btn-secondary">
                  Voltar
                </button>
              </div>
            )}
            {justActivated && <span className="text-sm text-emerald-400">Assinatura ativada!</span>}
          </div>
        )}
      </div>

      {canViewPayments && subscriptionPayments.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-ink-500">Histórico de pagamentos</h3>
          <div className="table-card">
            <table className="w-full text-left text-sm">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-2 font-medium">Data</th>
                  <th className="px-4 py-2 font-medium">Valor</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionPayments.map((p) => (
                  <tr key={p.id} className="border-t border-white/[0.05] text-white">
                    <td className="px-4 py-2">{formatDateTime(p.paid_at ?? p.created_at)}</td>
                    <td className="px-4 py-2 font-mono">{formatMoney(p.amount)}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          p.status === "PAID"
                            ? "badge-active"
                            : p.status === "FAILED"
                              ? "rounded-full bg-red-950/40 px-2 py-0.5 text-xs font-medium text-red-300"
                              : "badge-inactive"
                        }
                      >
                        {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
