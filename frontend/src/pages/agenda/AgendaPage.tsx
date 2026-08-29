import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { listAppointments } from "@/api/appointments";
import { listEmployees } from "@/api/employees";
import { AgendaFilterSheet } from "@/components/appointments/AgendaFilterSheet";
import { AppointmentFormModal } from "@/components/appointments/AppointmentFormModal";
import { AppointmentRow } from "@/components/appointments/AppointmentRow";
import { DatePickerButton } from "@/components/DatePickerButton";
import { FabButton } from "@/components/FabButton";
import { getDayRange, getMonthRange, getWeekRange, toDateInputValue } from "@/lib/datetime";
import { useAuthStore } from "@/store/authStore";
import { MonthView } from "@/pages/agenda/MonthView";
import { WeekView } from "@/pages/agenda/WeekView";
import type { AppointmentStatus } from "@/types/appointment";

type ViewMode = "day" | "week" | "month";

export function AgendaPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [view, setView] = useState<ViewMode>("day");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [employeeId, setEmployeeId] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeFilterCount = (employeeId ? 1 : 0) + statusFilter.length;

  function toggleStatusFilter(status: AppointmentStatus) {
    setStatusFilter((current) =>
      current.includes(status) ? current.filter((s) => s !== status) : [...current, status],
    );
  }

  function clearFilters() {
    setEmployeeId("");
    setStatusFilter([]);
  }

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

  const filteredAppointments = (appointments ?? []).filter(
    (a) => statusFilter.length === 0 || statusFilter.includes(a.status),
  );

  const dayAppointments = filteredAppointments.filter(
    (a) => view !== "day" || toDateInputValue(new Date(a.starts_at)) === date,
  );

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-xl font-semibold text-white">Agenda</h1>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-full border border-white/[0.08] text-sm">
          {(["day", "week", "month"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setView(mode)}
              className={`px-3.5 py-1.5 ${
                view === mode ? "bg-gold text-ink-950" : "text-ink-300 hover:bg-ink-800"
              }`}
            >
              {mode === "day" ? "Dia" : mode === "week" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => shiftByView(-1)}
            aria-label="Período anterior"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-sm text-ink-300 hover:bg-ink-800"
          >
            ←
          </button>
          <DatePickerButton value={date} onChange={setDate} label="Escolher data" />
          <button
            onClick={() => shiftByView(1)}
            aria-label="Próximo período"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] text-sm text-ink-300 hover:bg-ink-800"
          >
            →
          </button>
        </div>

        <button
          onClick={() => setFiltersOpen(true)}
          aria-label="Filtros"
          title="Filtros"
          className="press-scale relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-ink-900 text-ink-300 hover:bg-ink-800"
        >
          <SlidersHorizontal size={15} />
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-ink-950">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-6">
        {isLoading && <p className="text-ink-500">Carregando...</p>}
        {isError && <p className="text-red-400">Não foi possível carregar a agenda.</p>}

        {!isLoading && !isError && view === "day" && (
          <div className="space-y-3">
            {dayAppointments.length === 0 && (
              <p className="text-ink-500">Nenhum agendamento neste dia.</p>
            )}
            {dayAppointments.map((appointment, index) => (
              <div
                key={appointment.id}
                style={{ animationDelay: `${Math.min(index, 8) * 0.03}s` }}
                className="animate-row-in"
              >
                <AppointmentRow appointment={appointment} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && view === "week" && (
          <WeekView
            date={date}
            appointments={filteredAppointments}
            onSelectDay={(d) => {
              setDate(d);
              setView("day");
            }}
          />
        )}

        {!isLoading && !isError && view === "month" && (
          <MonthView
            date={date}
            appointments={filteredAppointments}
            onSelectDay={(d) => {
              setDate(d);
              setView("day");
            }}
          />
        )}
      </div>

      {hasPermission("appointments.create") && (
        <FabButton label="Novo agendamento" onClick={() => setShowCreateModal(true)} />
      )}

      {showCreateModal && (
        <AppointmentFormModal defaultDate={date} onClose={() => setShowCreateModal(false)} />
      )}

      {filtersOpen && (
        <AgendaFilterSheet
          employees={employeesPage?.items ?? []}
          employeeId={employeeId}
          onEmployeeChange={setEmployeeId}
          statusFilter={statusFilter}
          onToggleStatus={toggleStatusFilter}
          onClear={clearFilters}
          onClose={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}
