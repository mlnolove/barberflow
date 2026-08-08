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
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Próximos agendamentos
        </h3>
        <Link to="/agenda" className="text-xs text-brand-secondary hover:underline">
          Ver agenda →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">
          Nenhum agendamento próximo.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 px-4 py-3 text-sm">
              <span className="w-12 shrink-0 font-semibold tabular-nums">
                {formatTime(item.starts_at)}
              </span>
              <div className="flex-1">
                <p className="font-medium">{item.customer_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {item.service_name} · {item.employee_name}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
