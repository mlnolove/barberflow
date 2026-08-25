import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";

import { addTenantPhoto, deleteTenantPhoto, listTenantPhotos } from "@/api/settings";

export function PhotosTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings-photos"],
    queryFn: listTenantPhotos,
  });

  const addMutation = useMutation({
    mutationFn: () => addTenantPhoto(url, data?.length ?? 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-photos"] });
      setUrl("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenantPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-photos"] }),
  });

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-ink-500">
        Fotos exibidas no perfil público da barbearia pro cliente. Cole o link de uma imagem já
        hospedada (sem upload de arquivo por aqui ainda).
      </p>

      {canEdit && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) addMutation.mutate();
          }}
          className="mb-4 flex gap-2"
        >
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="field-input mt-0 flex-1"
          />
          <button type="submit" disabled={addMutation.isPending || !url.trim()} className="btn-primary">
            {addMutation.isPending ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
      )}

      {isLoading && <p className="text-sm text-ink-500">Carregando...</p>}
      {isError && <p className="text-sm text-red-400">Não foi possível carregar as fotos.</p>}
      {data && data.length === 0 && <p className="text-sm text-ink-500">Nenhuma foto cadastrada ainda.</p>}

      {data && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {data.map((photo) => (
            <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-ink-900">
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              {canEdit && (
                <button
                  onClick={() => deleteMutation.mutate(photo.id)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-950/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
