import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { listAppointments } from "@/api/appointments";
import { listEmployees } from "@/api/employees";
import { AppointmentFormModal } from "@/components/appointments/AppointmentFormModal";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { getDayRange, getMonthRange, getWeekRange, toDateInputValue } from "@/lib/datetime";
import { useAuthStore } from "@/store/authStore";
import { MonthView } from "@/pages/agenda/MonthView";
import { WeekView } from "@/pages/agenda/WeekView";

type ViewMode = "day" | "week" | "month";

export function AgendaPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [view, setView] = useState<ViewMode>("day");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [employeeId, setEmployeeId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: employeesPage } = useQuery({
    queryKey: ["employees", { status: "active-for-select" }],
    queryFn: () => listEmployees({ is_active: true, limit: 100 }),
  });

  const range = useMemo(() => {
    if (view === "day") return getDayRange(date);
    if (view === "week") return getWeekRange(date);
    return getMonthRange(date);
  }, [view, date]);

  const { data: appointments, isLoading, isError } = useQuery({
    queryKey: ["appointments", { start: range.start.toISOString(), end: range.end.toISOString(), employeeId }],
    queryFn: () =>
      listAppointments({
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        employee_id: employeeId || undefined,
      }),
  });

  function shiftDate(days: number) {
    const current = new Date(`${date}T00:00:00`);
    current.setDate(current.getDate() + days);
    setDate(toDateInputValue(current));
  }

  function shiftByView(direction: 1 | -1) {
    if (view === "day") return shiftDate(direction * 1);
    if (view === "week") return shiftDate(direction * 7);
    const current = new Date(`${date}T00:00:00`);
    current.setMonth(current.getMonth() + direction);
    setDate(toDateInputValue(current));
  }

  const dayAppointments = (appointments ?? []).filter(
    (a) => view !== "day" || toDateInputValue(new Date(a.starts_at)) === date,
  );

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Agenda</h1>
        {hasPermission("appointments.create") && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Novo agendamento
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-slate-300 text-sm dark:border-slate-700">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`px-3 py-1.5 ${
                view === mode
                  ? "bg-brand text-white"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => shiftByView(-1)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ←
          </button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            onClick={() => shiftByView(1)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            →
          </button>
        </div>

        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="">Todos os profissionais</option>
          {employeesPage?.items.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {isLoading && <p className="text-slate-500">Carregando...</p>}
        {isError && <p className="text-red-600">Não foi possível carregar a agenda.</p>}

        {!isLoading && !isError && view === "day" && (
          <div className="space-y-3">
            {dayAppointments.length === 0 && (
              <p className="text-slate-500">Nenhum agendamento neste dia.</p>
            )}
            {dayAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} />
            ))}
          </div>
        )}

        {!isLoading && !isError && view === "week" && (
          <WeekView
            date={date}
            appointments={appointments ?? []}
            onSelectDay={(d) => {
              setDate(d);
              setView("day");
            }}
          />
        )}

        {!isLoading && !isError && view === "month" && (
          <MonthView
            date={date}
            appointments={appointments ?? []}
            onSelectDay={(d) => {
              setDate(d);
              setView("day");
            }}
          />
        )}
      </div>

      {showCreateModal && (
        <AppointmentFormModal defaultDate={date} onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
