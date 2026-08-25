import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { callNext, listQueue, markQueueNoShow, startQueueService } from "@/api/staffQueue";
import { QueueCancelModal } from "@/components/queue/QueueCancelModal";
import { QueueCompleteModal } from "@/components/queue/QueueCompleteModal";
import { QueueJoinModal } from "@/components/queue/QueueJoinModal";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import type { StaffQueueEntry } from "@/types/staffQueue";

const STATUS_LABELS: Record<string, string> = {
  WAITING: "Aguardando",
  CALLED: "Chamado",
  IN_SERVICE: "Em atendimento",
};

const STATUS_STYLES: Record<string, string> = {
  WAITING: "bg-ink-800 text-ink-400",
  CALLED: "bg-amber-950/40 text-amber-300",
  IN_SERVICE: "bg-emerald-950/40 text-emerald-300",
};

export function QueueBoardPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [completingEntry, setCompletingEntry] = useState<StaffQueueEntry | null>(null);
  const [cancellingEntry, setCancellingEntry] = useState<StaffQueueEntry | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["queue"],
    queryFn: listQueue,
    refetchInterval: 10_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["queue"] });

  const callNextMutation = useMutation({ mutationFn: () => callNext(), onSuccess: invalidate });
  const startMutation = useMutation({ mutationFn: startQueueService, onSuccess: invalidate });
  const noShowMutation = useMutation({ mutationFn: markQueueNoShow, onSuccess: invalidate });

  const waiting = data?.filter((e) => e.status === "WAITING") ?? [];
  const active = data?.filter((e) => e.status === "CALLED" || e.status === "IN_SERVICE") ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-white">Fila de espera</h1>
        <div className="flex gap-2">
          {hasPermission("appointments.confirm") && waiting.length > 0 && (
            <button
              onClick={() => callNextMutation.mutate()}
              disabled={callNextMutation.isPending}
              className="btn-secondary"
            >
              {callNextMutation.isPending ? "Chamando..." : "Chamar próximo"}
            </button>
          )}
          {hasPermission("appointments.create") && (
            <button onClick={() => setShowJoinModal(true)} className="btn-primary">
              Adicionar à fila
            </button>
          )}
        </div>
      </div>

      <div className="mt-6">
        {isLoading && <p className="text-ink-500">Carregando...</p>}
        {isError && <p className="text-red-400">Não foi possível carregar a fila.</p>}

        {data && data.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-900 py-16 text-center">
            <Users size={28} className="text-ink-600" />
            <p className="text-sm text-ink-500">Ninguém na fila no momento.</p>
          </div>
        )}

        {active.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-ink-500">Em atendimento</h2>
            <div className="space-y-3">
              {active.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-ink-900 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white">{entry.customer.full_name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[entry.status]}`}>
                        {STATUS_LABELS[entry.status]}
                      </span>
                    </div>
                    <p className="text-sm text-ink-500">
                      {entry.service.name} · {formatMoney(entry.service.price)}
                      {entry.employee && ` · ${entry.employee.full_name}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {entry.status === "CALLED" && hasPermission("appointments.start") && (
                      <button
                        onClick={() => startMutation.mutate(entry.id)}
                        className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
                      >
                        Iniciar atendimento
                      </button>
                    )}
                    {entry.status === "CALLED" && hasPermission("appointments.cancel") && (
                      <button
                        onClick={() => noShowMutation.mutate(entry.id)}
                        className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
                      >
                        Não compareceu
                      </button>
                    )}
                    {entry.status === "IN_SERVICE" && hasPermission("appointments.complete") && (
                      <button
                        onClick={() => setCompletingEntry(entry)}
                        className="btn-secondary px-2.5 py-1 text-xs"
                      >
                        Finalizar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {waiting.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-ink-500">Aguardando</h2>
            <div className="space-y-2">
              {waiting.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-ink-900 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/[0.1] font-mono text-sm font-semibold text-gold">
                    {entry.position}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{entry.customer.full_name}</p>
                    <p className="text-sm text-ink-500">
                      {entry.service.name}
                      {entry.employee && ` · ${entry.employee.full_name}`}
                    </p>
                  </div>
                  {hasPermission("appointments.cancel") && (
                    <button
                      onClick={() => setCancellingEntry(entry)}
                      className="rounded-md border border-red-900/40 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showJoinModal && <QueueJoinModal onClose={() => setShowJoinModal(false)} />}
      {completingEntry && (
        <QueueCompleteModal entry={completingEntry} onClose={() => setCompletingEntry(null)} />
      )}
      {cancellingEntry && (
        <QueueCancelModal entry={cancellingEntry} onClose={() => setCancellingEntry(null)} />
      )}
    </div>
  );
}
