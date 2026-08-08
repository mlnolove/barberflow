import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { createBlockedDate, deleteBlockedDate, listBlockedDates } from "@/api/settings";

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function BlockedDatesTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings-blocked-dates"],
    queryFn: listBlockedDates,
  });

  const createMutation = useMutation({
    mutationFn: createBlockedDate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-blocked-dates"] });
      setDate("");
      setReason("");
      setError(null);
    },
    onError: () => setError("Não foi possível bloquear esta data. Ela já pode estar bloqueada."),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlockedDate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-blocked-dates"] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("Selecione uma data.");
      return;
    }
    createMutation.mutate({ date, reason: reason || undefined });
  }

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Datas bloqueadas ficam indisponíveis para novos agendamentos — feriados, folgas coletivas
        ou eventos, por exemplo.
      </p>

      {canEdit && (
        <form onSubmit={handleSubmit} className="mb-2 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="blocked-date" className="block text-sm font-medium">
              Data
            </label>
            <input
              id="blocked-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="blocked-reason" className="block text-sm font-medium">
              Motivo (opcional)
            </label>
            <input
              id="blocked-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Feriado, confraternização..."
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {createMutation.isPending ? "Adicionando..." : "Bloquear data"}
          </button>
        </form>
      )}
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="mt-4">
        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
        {isError && (
          <p className="text-sm text-red-600">Não foi possível carregar as datas bloqueadas.</p>
        )}

        {data && data.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nenhuma data bloqueada.</p>
        )}

        {data && data.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {data.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium capitalize">{formatDate(b.date)}</p>
                  {b.reason && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{b.reason}</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => deleteMutation.mutate(b.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    Remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
