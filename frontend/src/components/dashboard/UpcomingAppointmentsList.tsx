import { Link } from "react-router-dom";

import { formatTime } from "@/lib/datetime";
import type { UpcomingAppointmentItem } from "@/types/dashboard";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
};

interface UpcomingAppointmentsListProps {
  items: UpcomingAppointmentItem[];
}

export function UpcomingAppointmentsList({ items }: UpcomingAppointmentsListProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-900">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <h3 className="text-sm font-semibold text-ink-300">Próximos agendamentos</h3>
        <Link to="/agenda" className="text-xs text-gold hover:underline">
          Ver agenda →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-600">Nenhum agendamento próximo.</p>
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {items.map((item, index) => (
            <li
              key={item.id}
              style={{ animationDelay: `${Math.min(index, 6) * 0.04}s` }}
              className="animate-row-in flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-ink-800/40"
            >
              <span className="w-12 shrink-0 font-mono font-semibold tabular-nums text-white">
                {formatTime(item.starts_at)}
              </span>
              <div className="flex-1">
                <p className="font-medium text-white">{item.customer_name}</p>
                <p className="text-xs text-ink-500">
                  {item.service_name} · {item.employee_name}
                </p>
              </div>
              <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-ink-400">
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
