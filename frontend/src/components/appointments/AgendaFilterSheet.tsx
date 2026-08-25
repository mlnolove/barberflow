import { Check, X } from "lucide-react";

import { ALL_APPOINTMENT_STATUSES, STATUS_DOT_COLORS, STATUS_LABELS } from "@/lib/appointmentStatus";
import type { AppointmentStatus } from "@/types/appointment";

interface EmployeeOption {
  id: string;
  full_name: string;
}

interface AgendaFilterSheetProps {
  employees: EmployeeOption[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  statusFilter: AppointmentStatus[];
  onToggleStatus: (status: AppointmentStatus) => void;
  onClear: () => void;
  onClose: () => void;
}

export function AgendaFilterSheet({
  employees,
  employeeId,
  onEmployeeChange,
  statusFilter,
  onToggleStatus,
  onClear,
  onClose,
}: AgendaFilterSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Fechar filtros"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-md rounded-t-2xl border border-white/[0.08] bg-ink-900 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-2xl sm:rounded-2xl sm:pb-5"
        style={{ animation: "slide-up-sheet 0.28s cubic-bezier(0.16,1,0.3,1) both" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/[0.12] sm:hidden" />

        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-white">Filtros</h2>
          <button onClick={onClose} aria-label="Fechar" className="text-ink-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Profissional</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => onEmployeeChange("")}
              className={`press-scale rounded-full border px-3 py-1.5 text-sm transition-colors ${
                employeeId === ""
                  ? "border-gold bg-gold text-ink-950"
                  : "border-white/[0.08] text-ink-300 hover:bg-ink-800"
              }`}
            >
              Todos
            </button>
            {employees.map((employee) => (
              <button
                key={employee.id}
                onClick={() => onEmployeeChange(employee.id)}
                className={`press-scale rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  employeeId === employee.id
                    ? "border-gold bg-gold text-ink-950"
                    : "border-white/[0.08] text-ink-300 hover:bg-ink-800"
                }`}
              >
                {employee.full_name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ALL_APPOINTMENT_STATUSES.map((status) => {
              const active = statusFilter.includes(status);
              return (
                <button
                  key={status}
                  onClick={() => onToggleStatus(status)}
                  className={`press-scale flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-gold bg-gold/[0.12] text-gold"
                      : "border-white/[0.08] text-ink-300 hover:bg-ink-800"
                  }`}
                >
                  {active ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT_COLORS[status]}`} />
                  )}
                  {STATUS_LABELS[status]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={onClear}
            className="flex-1 rounded-md border border-white/[0.08] px-4 py-2.5 text-sm text-ink-300 hover:bg-ink-800"
          >
            Limpar filtros
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-md bg-gold px-4 py-2.5 text-sm font-medium text-ink-950 hover:opacity-90"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
