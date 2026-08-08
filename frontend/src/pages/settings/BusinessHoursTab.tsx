import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { listBusinessHours, updateBusinessHours } from "@/api/settings";
import type { BusinessHours, BusinessHoursUpdatePayload } from "@/types/settings";

const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

interface RowProps {
  hours: BusinessHours;
  canEdit: boolean;
}

function BusinessHoursRow({ hours, canEdit }: RowProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(hours.is_open);
  const [openTime, setOpenTime] = useState(hours.open_time?.slice(0, 5) ?? "09:00");
  const [closeTime, setCloseTime] = useState(hours.close_time?.slice(0, 5) ?? "19:00");
  const [hasBreak, setHasBreak] = useState(Boolean(hours.break_start_time && hours.break_end_time));
  const [breakStart, setBreakStart] = useState(hours.break_start_time?.slice(0, 5) ?? "12:00");
  const [breakEnd, setBreakEnd] = useState(hours.break_end_time?.slice(0, 5) ?? "13:00");
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: BusinessHoursUpdatePayload) => updateBusinessHours(hours.weekday, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData<BusinessHours[]>(["settings-business-hours"], (current) =>
        current ? current.map((h) => (h.weekday === updated.weekday ? updated : h)) : current,
      );
      setError(null);
      setJustSaved(true);
    },
    onError: () => setError("Não foi possível salvar este dia."),
  });

  useEffect(() => {
    if (!justSaved) return;
    const timeout = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timeout);
  }, [justSaved]);

  function handleSave() {
    if (isOpen) {
      if (!openTime || !closeTime) {
        setError("Informe abertura e fechamento.");
        return;
      }
      if (closeTime <= openTime) {
        setError("O fechamento deve ser depois da abertura.");
        return;
      }
      if (hasBreak) {
        if (breakEnd <= breakStart) {
          setError("O fim do intervalo deve ser depois do início.");
          return;
        }
        if (breakStart < openTime || breakEnd > closeTime) {
          setError("O intervalo deve estar dentro do horário de funcionamento.");
          return;
        }
      }
    }
    setError(null);
    mutation.mutate({
      is_open: isOpen,
      open_time: isOpen ? `${openTime}:00` : null,
      close_time: isOpen ? `${closeTime}:00` : null,
      break_start_time: isOpen && hasBreak ? `${breakStart}:00` : null,
      break_end_time: isOpen && hasBreak ? `${breakEnd}:00` : null,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <label className="flex w-28 items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          disabled={!canEdit}
          checked={isOpen}
          onChange={(e) => setIsOpen(e.target.checked)}
        />
        {DAY_LABELS[hours.weekday]}
      </label>

      {isOpen ? (
        <>
          <input
            type="time"
            disabled={!canEdit}
            value={openTime}
            onChange={(e) => setOpenTime(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          />
          <span className="text-sm text-slate-400">às</span>
          <input
            type="time"
            disabled={!canEdit}
            value={closeTime}
            onChange={(e) => setCloseTime(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
          />

          <label className="ml-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={hasBreak}
              onChange={(e) => setHasBreak(e.target.checked)}
            />
            Intervalo
          </label>
          {hasBreak && (
            <>
              <input
                type="time"
                disabled={!canEdit}
                value={breakStart}
                onChange={(e) => setBreakStart(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
              />
              <span className="text-sm text-slate-400">às</span>
              <input
                type="time"
                disabled={!canEdit}
                value={breakEnd}
                onChange={(e) => setBreakEnd(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800"
              />
            </>
          )}
        </>
      ) : (
        <span className="text-sm text-slate-400">Fechado</span>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={handleSave}
          disabled={mutation.isPending}
          className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
      )}
      {justSaved && <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvo!</span>}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function BusinessHoursTab({ canEdit }: { canEdit: boolean }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings-business-hours"],
    queryFn: listBusinessHours,
  });

  return (
    <div className="max-w-3xl">
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Defina os dias e horários em que a barbearia atende. Fora desses horários — e durante o
        intervalo, se houver — a agenda não aceita novos agendamentos.
      </p>
      {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
      {isError && <p className="text-sm text-red-600">Não foi possível carregar os horários.</p>}
      {data && (
        <div className="rounded-xl border border-slate-200 px-4 dark:border-slate-800">
          {data.map((h) => (
            <BusinessHoursRow key={h.weekday} hours={h} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
