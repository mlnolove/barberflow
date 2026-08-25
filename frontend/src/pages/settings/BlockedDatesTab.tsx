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
      <p className="mb-4 text-sm text-ink-500">
        Datas bloqueadas ficam indisponíveis para novos agendamentos — feriados, folgas coletivas
        ou eventos, por exemplo.
      </p>

      {canEdit && (
        <form onSubmit={handleSubmit} className="mb-2 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="blocked-date" className="field-label">
              Data
            </label>
            <input
              id="blocked-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="field-input"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="blocked-reason" className="field-label">
              Motivo (opcional)
            </label>
            <input
              id="blocked-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Feriado, confraternização..."
              className="field-input"
            />
          </div>
          <button type="submit" disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? "Adicionando..." : "Bloquear data"}
          </button>
        </form>
      )}
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mt-4">
        {isLoading && <p className="text-sm text-ink-500">Carregando...</p>}
        {isError && (
          <p className="text-sm text-red-400">Não foi possível carregar as datas bloqueadas.</p>
        )}

        {data && data.length === 0 && <p className="text-sm text-ink-500">Nenhuma data bloqueada.</p>}

        {data && data.length > 0 && (
          <ul className="divide-y divide-white/[0.05] rounded-xl border border-white/[0.06] bg-ink-900">
            {data.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium capitalize text-white">{formatDate(b.date)}</p>
                  {b.reason && <p className="text-xs text-ink-500">{b.reason}</p>}
                </div>
                {canEdit && (
                  <button
                    onClick={() => deleteMutation.mutate(b.id)}
                    disabled={deleteMutation.isPending}
                    className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800 disabled:opacity-60"
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
