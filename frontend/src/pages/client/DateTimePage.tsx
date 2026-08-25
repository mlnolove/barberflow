import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { getAvailability } from "@/api/clientBarbershops";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { useBookingFlowStore } from "@/store/bookingFlowStore";

function nextDays(count: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function DateTimePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const employeeId = useBookingFlowStore((s) => s.employeeId);
  const serviceId = useBookingFlowStore((s) => s.serviceId);
  const date = useBookingFlowStore((s) => s.date);
  const time = useBookingFlowStore((s) => s.time);
  const setDateTime = useBookingFlowStore((s) => s.setDateTime);

  const days = useMemo(() => nextDays(14), []);
  const [selectedDate, setSelectedDate] = useState(date ?? toDateKey(days[0]));

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-availability", tenantId, employeeId, serviceId, selectedDate],
    queryFn: () =>
      getAvailability(tenantId!, {
        employee_id: employeeId!,
        service_id: serviceId!,
        date: selectedDate,
      }),
    enabled: Boolean(tenantId && employeeId && serviceId && selectedDate),
  });

  const errorMessage =
    isAxiosError(error) && typeof error.response?.data?.detail === "string"
      ? error.response.data.detail
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar title="Data e horário" onBack={() => navigate(-1)} />
      <div className="flex-1 pb-28">
        <div className="mb-6 flex gap-2 overflow-x-auto px-5">
          {days.map((d) => {
            const key = toDateKey(d);
            const active = selectedDate === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedDate(key)}
                className="flex w-11 shrink-0 flex-col items-center gap-1 rounded-xl py-3 transition-all"
                style={{
                  background: active ? "#C8A65E" : "#161614",
                  border: active ? "none" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span className="text-[10px] font-medium" style={{ color: active ? "#0C0C0B" : "#7a7a72" }}>
                  {WEEKDAY_SHORT[d.getDay()]}
                </span>
                <span className="text-sm font-bold" style={{ color: active ? "#0C0C0B" : "white" }}>
                  {d.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-5">
          <h4 className="mb-3 text-[10px] uppercase tracking-widest text-ink-600">
            Horários disponíveis
          </h4>
          {isLoading && <p className="text-sm text-ink-500">Carregando horários...</p>}
          {errorMessage && <p className="text-sm text-red-400">{errorMessage}</p>}
          {data && data.slots.length === 0 && !errorMessage && (
            <p className="text-sm text-ink-500">Nenhum horário disponível neste dia.</p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {data?.slots.map((slot) => {
              const slotTime = slot.starts_at.slice(11, 16);
              const active = time === slotTime && date === selectedDate;
              return (
                <button
                  key={slot.starts_at}
                  onClick={() => setDateTime(selectedDate, slotTime)}
                  className="h-10 rounded-xl font-mono text-xs font-medium transition-all"
                  style={{
                    background: active ? "#C8A65E" : "#161614",
                    color: active ? "#0C0C0B" : "white",
                    border: active ? "none" : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  {slotTime}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-white/[0.06] bg-ink-950/95 px-5 pb-8 pt-4 backdrop-blur-md">
        <button
          onClick={() => date && time && navigate(`/c/barbearia/${tenantId}/confirmar`)}
          disabled={!date || !time}
          className="h-12 w-full rounded-xl text-sm font-semibold transition-all disabled:bg-ink-800 disabled:text-ink-600"
          style={date && time ? { background: "#C8A65E", color: "#0C0C0B" } : undefined}
        >
          {date && time ? `Continuar — ${time}` : "Selecione um horário"}
        </button>
      </div>
    </div>
  );
}
