import { formatTime, getWeekRange, toDateInputValue } from "@/lib/datetime";
import type { Appointment } from "@/types/appointment";

const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

interface WeekViewProps {
  date: string;
  appointments: Appointment[];
  onSelectDay: (date: string) => void;
}

export function WeekView({ date, appointments, onSelectDay }: WeekViewProps) {
  const { start } = getWeekRange(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day, index) => {
        const dayStr = toDateInputValue(day);
        const dayAppointments = appointments.filter(
          (a) => toDateInputValue(new Date(a.starts_at)) === dayStr,
        );
        return (
          <button
            key={dayStr}
            onClick={() => onSelectDay(dayStr)}
            className="min-h-[140px] rounded-xl border border-slate-200 p-3 text-left hover:border-brand-secondary dark:border-slate-800"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {DAY_LABELS[index]}
            </p>
            <p className="text-sm font-semibold">{day.getDate()}</p>
            <div className="mt-2 space-y-1">
              {dayAppointments.slice(0, 4).map((a) => (
                <p key={a.id} className="truncate text-xs">
                  {formatTime(a.starts_at)} {a.customer.full_name}
                </p>
              ))}
              {dayAppointments.length > 4 && (
                <p className="text-xs text-slate-400">+{dayAppointments.length - 4} mais</p>
              )}
              {dayAppointments.length === 0 && (
                <p className="text-xs text-slate-400">Sem agendamentos</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
