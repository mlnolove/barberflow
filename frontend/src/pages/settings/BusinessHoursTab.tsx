import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock, Copy, Plus, X } from "lucide-react";

import { listBusinessHours, updateBusinessHours } from "@/api/settings";
import type { BusinessHours, BusinessHoursUpdatePayload } from "@/types/settings";

const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const DAY_ABBR = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];

interface DayDraft {
  weekday: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  hasBreak: boolean;
  breakStart: string;
  breakEnd: string;
}

function toDraft(h: BusinessHours): DayDraft {
  return {
    weekday: h.weekday,
    isOpen: h.is_open,
    openTime: h.open_time?.slice(0, 5) ?? "09:00",
    closeTime: h.close_time?.slice(0, 5) ?? "19:00",
    hasBreak: Boolean(h.break_start_time && h.break_end_time),
    breakStart: h.break_start_time?.slice(0, 5) ?? "12:00",
    breakEnd: h.break_end_time?.slice(0, 5) ?? "13:00",
  };
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function validate(d: DayDraft): string | null {
  if (!d.isOpen) return null;
  if (!d.openTime || !d.closeTime) return "Informe abertura e fechamento.";
  if (d.closeTime <= d.openTime) return "O fechamento deve ser depois da abertura.";
  if (d.hasBreak) {
    if (d.breakEnd <= d.breakStart) return "O fim do intervalo deve ser depois do início.";
    if (d.breakStart < d.openTime || d.breakEnd > d.closeTime) {
      return "O intervalo deve estar dentro do horário de funcionamento.";
    }
  }
  return null;
}

function toPayload(d: DayDraft): BusinessHoursUpdatePayload {
  return {
    is_open: d.isOpen,
    open_time: d.isOpen ? `${d.openTime}:00` : null,
    close_time: d.isOpen ? `${d.closeTime}:00` : null,
    break_start_time: d.isOpen && d.hasBreak ? `${d.breakStart}:00` : null,
    break_end_time: d.isOpen && d.hasBreak ? `${d.breakEnd}:00` : null,
  };
}

export function BusinessHoursTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings-business-hours"],
    queryFn: listBusinessHours,
  });

  const [days, setDays] = useState<DayDraft[] | null>(null);
  const [pulses, setPulses] = useState<Set<number>>(new Set());
  const [errors, setErrors] = useState<Record<number, string | null>>({});

  useEffect(() => {
    if (data && days === null) {
      setDays([...data].sort((a, b) => a.weekday - b.weekday).map(toDraft));
    }
  }, [data, days]);

  const mutation = useMutation({
    mutationFn: ({ weekday, payload }: { weekday: number; payload: BusinessHoursUpdatePayload }) =>
      updateBusinessHours(weekday, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<BusinessHours[]>(["settings-business-hours"], (current) =>
        current ? current.map((h) => (h.weekday === updated.weekday ? updated : h)) : current,
      );
    },
    onError: (_err, variables) => {
      setErrors((prev) => ({ ...prev, [variables.weekday]: "Não foi possível salvar este dia." }));
    },
  });

  function pulseDay(weekday: number) {
    setPulses((prev) => new Set(prev).add(weekday));
    setTimeout(() => {
      setPulses((prev) => {
        const next = new Set(prev);
        next.delete(weekday);
        return next;
      });
    }, 1600);
  }

  function commitDay(weekday: number, draft: DayDraft) {
    const error = validate(draft);
    setErrors((prev) => ({ ...prev, [weekday]: error }));
    if (error) return;
    mutation.mutate({ weekday, payload: toPayload(draft) });
    pulseDay(weekday);
  }

  function updateDay(weekday: number, patch: Partial<DayDraft>) {
    if (!days) return;
    const nextDays = days.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d));
    setDays(nextDays);
    if (canEdit) commitDay(weekday, nextDays.find((d) => d.weekday === weekday)!);
  }

  function copyMondayToWeekdays() {
    if (!days) return;
    const monday = days[0];
    const nextDays = days.map((d) =>
      d.weekday >= 1 && d.weekday <= 4
        ? {
            ...d,
            isOpen: monday.isOpen,
            openTime: monday.openTime,
            closeTime: monday.closeTime,
            hasBreak: monday.hasBreak,
            breakStart: monday.breakStart,
            breakEnd: monday.breakEnd,
          }
        : d,
    );
    setDays(nextDays);
    if (canEdit) {
      nextDays.filter((d) => d.weekday >= 1 && d.weekday <= 4).forEach((d) => commitDay(d.weekday, d));
    }
  }

  if (isLoading || !days) {
    return <p className="text-sm text-ink-500">{isLoading ? "Carregando..." : ""}</p>;
  }
  if (isError) {
    return <p className="text-sm text-red-400">Não foi possível carregar os horários.</p>;
  }

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-ink-500">
        Defina os dias e horários em que a barbearia atende. Fora desses horários — e durante o
        intervalo, se houver — a agenda não aceita novos agendamentos.
      </p>

      {/* Relance semanal — visão de toda a semana numa tacada só */}
      <div className="rounded-2xl border border-white/[0.06] bg-ink-900 p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
            Semana em um relance
          </span>
          <span className="font-mono text-[10px] text-ink-500">00 — 24h</span>
        </div>
        <div className="flex flex-col gap-[7px]">
          {days.map((d) => {
            const openMin = toMinutes(d.openTime);
            const closeMin = toMinutes(d.closeTime);
            const span = Math.max(closeMin - openMin, 1);
            const barLeft = `${(openMin / 1440) * 100}%`;
            const barWidth = `${Math.max((span / 1440) * 100, 1.5)}%`;
            let breakLeft = "0%";
            let breakWidth = "0%";
            if (d.hasBreak) {
              const bs = toMinutes(d.breakStart);
              const be = toMinutes(d.breakEnd);
              breakLeft = `${Math.max(((bs - openMin) / span) * 100, 0)}%`;
              breakWidth = `${Math.max(((be - bs) / span) * 100, 0)}%`;
            }
            return (
              <div key={d.weekday} className="flex items-center gap-[9px]">
                <span className="w-[26px] shrink-0 text-[9px] font-medium text-ink-400">
                  {DAY_ABBR[d.weekday]}
                </span>
                <div className="relative h-[7px] flex-1 overflow-hidden rounded-full bg-ink-800">
                  {d.isOpen && (
                    <div
                      className="absolute inset-y-0 overflow-hidden rounded-full bg-gold"
                      style={{ left: barLeft, width: barWidth }}
                    >
                      {d.hasBreak && (
                        <div
                          className="absolute inset-y-0 bg-ink-950/60"
                          style={{ left: breakLeft, width: breakWidth }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={copyMondayToWeekdays}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.08] px-3.5 py-2 text-xs font-medium text-ink-300 hover:bg-ink-800"
          >
            <Copy size={12} strokeWidth={2} />
            Copiar Segunda p/ dias úteis
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {days.map((d) => {
          const pulsing = pulses.has(d.weekday);
          const error = errors[d.weekday];
          return (
            <div
              key={d.weekday}
              className="relative rounded-2xl border border-white/[0.06] bg-ink-900 p-4"
            >
              {pulsing && (
                <div className="absolute right-14 top-4 flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                  <Check size={11} strokeWidth={3} />
                  Salvo
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-ink-800 font-mono text-[10px] font-semibold text-ink-300">
                    {DAY_ABBR[d.weekday]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{DAY_LABELS[d.weekday]}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">{d.isOpen ? "Aberto" : "Fechado"}</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => updateDay(d.weekday, { isOpen: !d.isOpen })}
                  className="relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: d.isOpen ? "#C8A65E" : "#333330" }}
                >
                  <div
                    className="h-5 w-5 rounded-full bg-white transition-transform duration-150"
                    style={{ transform: d.isOpen ? "translateX(20px)" : "translateX(0px)" }}
                  />
                </button>
              </div>

              {d.isOpen && (
                <div className="mt-3 border-t border-white/[0.05] pt-3">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center gap-1.5 rounded-[10px] bg-ink-800 px-2.5 py-1.5">
                      <Clock size={13} className="shrink-0 text-ink-400" />
                      <input
                        type="time"
                        disabled={!canEdit}
                        value={d.openTime}
                        onChange={(e) => updateDay(d.weekday, { openTime: e.target.value })}
                        className="w-full bg-transparent p-0 font-mono text-[13px] text-white disabled:opacity-60"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] text-ink-500">até</span>
                    <div className="flex flex-1 items-center gap-1.5 rounded-[10px] bg-ink-800 px-2.5 py-1.5">
                      <Clock size={13} className="shrink-0 text-ink-400" />
                      <input
                        type="time"
                        disabled={!canEdit}
                        value={d.closeTime}
                        onChange={(e) => updateDay(d.weekday, { closeTime: e.target.value })}
                        className="w-full bg-transparent p-0 font-mono text-[13px] text-white disabled:opacity-60"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                  </div>

                  {d.hasBreak ? (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-1.5 rounded-[10px] border border-gold/20 bg-gold/[0.07] px-2.5 py-1.5">
                        <span className="shrink-0 text-[10.5px] font-medium text-gold">Intervalo</span>
                        <input
                          type="time"
                          disabled={!canEdit}
                          value={d.breakStart}
                          onChange={(e) => updateDay(d.weekday, { breakStart: e.target.value })}
                          className="ml-auto w-[62px] bg-transparent p-0 font-mono text-xs text-gold disabled:opacity-60"
                          style={{ colorScheme: "dark" }}
                        />
                        <span className="shrink-0 text-[11px] text-gold/60">—</span>
                        <input
                          type="time"
                          disabled={!canEdit}
                          value={d.breakEnd}
                          onChange={(e) => updateDay(d.weekday, { breakEnd: e.target.value })}
                          className="w-[62px] bg-transparent p-0 font-mono text-xs text-gold disabled:opacity-60"
                          style={{ colorScheme: "dark" }}
                        />
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => updateDay(d.weekday, { hasBreak: false })}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] text-ink-400 hover:bg-ink-800"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ) : (
                    canEdit && (
                      <button
                        onClick={() => updateDay(d.weekday, { hasBreak: true })}
                        className="mt-2 flex items-center gap-1.5 rounded-[10px] border border-dashed border-white/[0.12] px-2.5 py-1.5 text-[11px] text-ink-500"
                      >
                        <Plus size={11} />
                        Adicionar intervalo
                      </button>
                    )
                  )}
                </div>
              )}

              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
