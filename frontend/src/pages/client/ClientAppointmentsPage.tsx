import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Clock, X } from "lucide-react";

import { cancelMyAppointment, listMyAppointments } from "@/api/clientAppointments";
import { formatMoney } from "@/lib/format";
import type { ClientAppointment, ClientAppointmentStatus } from "@/types/clientAppointment";

type Tab = "upcoming" | "history" | "cancelled";

const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Próximos" },
  { id: "history", label: "Histórico" },
  { id: "cancelled", label: "Cancelados" },
];

const STATUS_STYLE: Record<ClientAppointmentStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-amber-900/40 text-amber-400 border-amber-800/40" },
  CONFIRMED: { label: "Confirmado", className: "bg-emerald-900/40 text-emerald-400 border-emerald-800/40" },
  IN_PROGRESS: { label: "Em andamento", className: "bg-amber-900/40 text-amber-400 border-amber-800/40" },
  COMPLETED: { label: "Concluído", className: "bg-ink-800 text-ink-400 border-ink-700" },
  CANCELLED: { label: "Cancelado", className: "bg-red-900/30 text-red-400 border-red-800/30" },
  NO_SHOW: { label: "Não compareceu", className: "bg-ink-800 text-ink-400 border-ink-700" },
};

function StatusBadge({ status }: { status: ClientAppointmentStatus }) {
  const v = STATUS_STYLE[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${v.className}`}>
      {v.label}
    </span>
  );
}

function matchesTab(appointment: ClientAppointment, tab: Tab): boolean {
  if (tab === "upcoming") return ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(appointment.status);
  if (tab === "history") return appointment.status === "COMPLETED";
  return ["CANCELLED", "NO_SHOW"].includes(appointment.status);
}

function CancelDialog({
  appointment,
  onClose,
}: {
  appointment: ClientAppointment;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => cancelMyAppointment(appointment.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-appointments"] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-2xl border-t border-white/10 bg-ink-900 p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-white">Cancelar agendamento</h3>
          <button onClick={onClose}>
            <X size={18} className="text-ink-500" />
          </button>
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (opcional para você, mas ajuda a barbearia)"
          rows={3}
          className="mb-2 w-full rounded-xl border border-white/10 bg-ink-800 p-3 text-sm text-white outline-none placeholder:text-ink-600"
        />
        {mutation.isError && (
          <p className="mb-2 text-xs text-red-400">
            Não foi possível cancelar. Verifique o prazo de cancelamento da barbearia.
          </p>
        )}
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || reason.trim().length < 3}
          className="h-11 w-full rounded-xl bg-red-500/90 text-sm font-semibold text-white disabled:opacity-40"
        >
          {mutation.isPending ? "Cancelando..." : "Confirmar cancelamento"}
        </button>
      </div>
    </div>
  );
}

export function ClientAppointmentsPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [cancelling, setCancelling] = useState<ClientAppointment | null>(null);

  const { data } = useQuery({
    queryKey: ["client-appointments", "all"],
    queryFn: () => listMyAppointments("all"),
  });

  const filtered = (data ?? []).filter((a) => matchesTab(a, tab));

  return (
    <div className="flex flex-col">
      <div className="px-5 pb-0 pt-6">
        <h1 className="mb-4 font-serif text-xl font-semibold text-white">Meus Agendamentos</h1>
        <div className="mb-4 flex rounded-xl bg-ink-900 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="h-8 flex-1 rounded-lg text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? "#C8A65E" : "transparent",
                color: tab === t.id ? "#0C0C0B" : "#7a7a72",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5">
        {filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-ink-500">Nenhum agendamento nesta categoria.</p>
        )}
        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <div key={a.id} className="rounded-2xl border border-white/[0.06] bg-ink-900 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{a.barbershop.name}</p>
                  <p className="text-xs text-ink-600">{a.employee.full_name}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="mb-3 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Calendar size={10} />
                  <span>
                    {new Date(a.starts_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Clock size={10} />
                  <span>
                    {new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
                <span className="text-xs text-ink-600">{a.service.name}</span>
                <span className="font-mono text-sm font-semibold text-gold">{formatMoney(a.price)}</span>
              </div>
              {(a.status === "PENDING" || a.status === "CONFIRMED") && (
                <button
                  onClick={() => setCancelling(a)}
                  className="mt-3 h-8 w-full rounded-lg border border-red-800/30 bg-red-900/10 text-xs text-red-400"
                >
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {cancelling && <CancelDialog appointment={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
}
