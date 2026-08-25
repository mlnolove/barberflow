import { formatTime, getWeekRange, toDateInputValue } from "@/lib/datetime";
import { STATUS_DOT_COLORS } from "@/lib/appointmentStatus";
import type { Appointment } from "@/types/appointment";

const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

interface WeekViewProps {
  date: string;
  appointments: Appointment[];
  onSelectDay: (date: string) => void;
}

export function WeekView({ date, appointments, onSelectDay }: WeekViewProps) {
  const { start } = getWeekRange(date);
  const today = toDateInputValue(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((day, index) => {
        const dayStr = toDateInputValue(day);
        const isToday = dayStr === today;
        const dayAppointments = appointments
          .filter((a) => toDateInputValue(new Date(a.starts_at)) === dayStr)
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        return (
          <button
            key={dayStr}
            onClick={() => onSelectDay(dayStr)}
            style={{ animationDelay: `${index * 0.04}s` }}
            className={`animate-rise-in press-scale flex min-h-[160px] flex-col rounded-xl border p-3 text-left transition-colors ${
              isToday
                ? "border-gold/40 bg-gold/[0.04]"
                : "border-white/[0.06] hover:border-gold/50 hover:bg-ink-900/60"
            }`}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div>
                <p className="text-xs font-medium text-ink-500">{DAY_LABELS[index]}</p>
                <p className={`text-sm font-semibold ${isToday ? "text-gold" : "text-white"}`}>
                  {day.getDate()}
                </p>
              </div>
              {dayAppointments.length > 0 && (
                <span className="rounded-full bg-ink-800 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400">
                  {dayAppointments.length}
                </span>
              )}
            </div>

            <div className="mt-2 flex-1 space-y-1.5">
              {dayAppointments.slice(0, 5).map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 text-xs">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT_COLORS[a.status]}`} />
                  <span className="shrink-0 font-mono text-ink-400">{formatTime(a.starts_at)}</span>
                  <span className="truncate text-ink-300">{a.customer.full_name}</span>
                </div>
              ))}
              {dayAppointments.length > 5 && (
                <p className="text-xs text-ink-600">+{dayAppointments.length - 5} mais</p>
              )}
              {dayAppointments.length === 0 && (
                <p className="text-xs text-ink-600">Sem agendamentos</p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
