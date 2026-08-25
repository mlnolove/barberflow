import { getMonthRange, toDateInputValue } from "@/lib/datetime";
import type { Appointment } from "@/types/appointment";

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface MonthViewProps {
  date: string;
  appointments: Appointment[];
  onSelectDay: (date: string) => void;
}

function isoWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function MonthView({ date, appointments, onSelectDay }: MonthViewProps) {
  const { start: monthStart, end: monthEnd } = getMonthRange(date);
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - isoWeekday(monthStart));

  const countByDay = new Map<string, number>();
  for (const appointment of appointments) {
    const key = toDateInputValue(new Date(appointment.starts_at));
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
  }

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  while (cursor < monthEnd || weeks.length < 1 || weeks[weeks.length - 1][6] < monthEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (week[6] >= monthEnd) break;
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-ink-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-2">
        {weeks.flat().map((day) => {
          const dayStr = toDateInputValue(day);
          const inMonth = day >= monthStart && day < monthEnd;
          const count = countByDay.get(dayStr) ?? 0;
          return (
            <button
              key={dayStr}
              onClick={() => onSelectDay(dayStr)}
              className={`flex h-20 flex-col items-center justify-start rounded-lg border p-2 text-sm text-white hover:border-gold/50 ${
                inMonth ? "border-white/[0.06]" : "border-transparent text-ink-700"
              }`}
            >
              <span>{day.getDate()}</span>
              {count > 0 && (
                <span className="mt-1 rounded-full bg-gold px-2 py-0.5 text-xs text-ink-950">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
