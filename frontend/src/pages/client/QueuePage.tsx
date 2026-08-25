import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { motion } from "motion/react";

import { getBarbershop } from "@/api/clientBarbershops";
import { cancelMyQueueEntry, joinQueue, listMyQueueEntries } from "@/api/clientQueue";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { formatMoney } from "@/lib/format";

const OPEN_STATUSES = new Set(["WAITING", "CALLED", "IN_SERVICE"]);

export function QueuePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState<string | null>(null);

  const { data: shop } = useQuery({
    queryKey: ["client-barbershop", tenantId],
    queryFn: () => getBarbershop(tenantId!),
    enabled: Boolean(tenantId),
  });

  const { data: entries } = useQuery({
    queryKey: ["client-queue-entries"],
    queryFn: listMyQueueEntries,
    refetchInterval: 10_000,
  });

  const activeEntry = entries?.find(
    (e) => e.barbershop.id === tenantId && OPEN_STATUSES.has(e.status),
  );

  const joinMutation = useMutation({
    mutationFn: () => joinQueue({ tenant_id: tenantId!, service_id: serviceId! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-queue-entries"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelMyQueueEntry(activeEntry!.id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-queue-entries"] }),
  });

  if (activeEntry) {
    return (
      <div className="flex min-h-screen flex-col bg-ink-950">
        <ClientTopBar title="Fila de espera" onBack={() => navigate(-1)} />
        <div className="flex flex-1 flex-col items-center justify-center px-6">
          <motion.div
            animate={{ scale: [1, 1.025, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="relative mb-8"
          >
            <div className="flex h-36 w-36 items-center justify-center rounded-full border border-gold/25">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-gold/[0.18]">
                <div className="flex h-[88px] w-[88px] flex-col items-center justify-center rounded-full border-[1.5px] border-gold/45 bg-gold/[0.05]">
                  <span className="font-serif text-5xl font-bold italic leading-none text-gold">
                    {activeEntry.position ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
          <h2 className="mb-2 text-center font-serif text-xl font-semibold text-white">
            {activeEntry.status === "WAITING"
              ? `Você é o número ${activeEntry.position}`
              : activeEntry.status === "CALLED"
                ? "Você foi chamado!"
                : "Em atendimento"}
          </h2>
          <p className="mb-8 text-center text-sm text-ink-400">{shop?.name}</p>

          <div className="mb-4 w-full rounded-2xl border border-white/[0.08] bg-ink-900 p-4">
            {[
              ["Serviço", activeEntry.service.name],
              activeEntry.employee ? ["Barbeiro", activeEntry.employee.full_name] : null,
            ]
              .filter((row): row is [string, string] => row !== null)
              .map(([label, value]) => (
                <div key={label} className="mb-2 flex items-center justify-between last:mb-0">
                  <span className="text-xs text-ink-600">{label}</span>
                  <span className="text-xs font-medium text-white">{value}</span>
                </div>
              ))}
          </div>

          {activeEntry.status === "WAITING" && (
            <button
              onClick={() => cancelMutation.mutate("Cliente saiu da fila pelo app.")}
              disabled={cancelMutation.isPending}
              className="rounded-xl border border-red-800/20 px-5 py-2.5 text-sm text-red-400"
            >
              Sair da fila
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar title="Entrar na fila" onBack={() => navigate(-1)} />
      <div className="flex-1 px-5 pb-28">
        <p className="mb-4 text-sm text-ink-400">
          Escolha o serviço — sua posição na fila é calculada pela barbearia em tempo real.
        </p>
        <div className="flex flex-col gap-2">
          {shop?.services.map((sv) => {
            const active = serviceId === sv.id;
            return (
              <button
                key={sv.id}
                onClick={() => setServiceId(sv.id)}
                className="flex items-center justify-between rounded-2xl border p-4 transition-all"
                style={{
                  background: active ? "rgba(200,166,94,0.08)" : "#161614",
                  borderColor: active ? "rgba(200,166,94,0.5)" : "rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-5 w-5 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: active ? "#C8A65E" : "#333330",
                      background: active ? "#C8A65E" : "transparent",
                    }}
                  >
                    {active && <Check size={11} className="text-ink-950" strokeWidth={2.5} />}
                  </div>
                  <span className="text-sm text-white">{sv.name}</span>
                </div>
                <span className="font-mono text-sm font-semibold text-gold">{formatMoney(sv.price)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-white/[0.06] bg-ink-950/95 px-5 pb-8 pt-4 backdrop-blur-md">
        <button
          onClick={() => joinMutation.mutate()}
          disabled={!serviceId || joinMutation.isPending}
          className="h-12 w-full rounded-xl text-sm font-semibold transition-all disabled:bg-ink-800 disabled:text-ink-600"
          style={serviceId ? { background: "#C8A65E", color: "#0C0C0B" } : undefined}
        >
          {joinMutation.isPending ? "Entrando..." : "Entrar na fila"}
        </button>
      </div>
    </div>
  );
}
