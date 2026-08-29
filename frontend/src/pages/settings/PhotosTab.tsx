import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";

import { addTenantPhoto, deleteTenantPhoto, listTenantPhotos } from "@/api/settings";
import { fileToResizedDataUrl } from "@/lib/imageResize";

const GALLERY_MAX_DIMENSION = 960;
const MAX_SOURCE_BYTES = 12 * 1024 * 1024;

export function PhotosTab({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["settings-photos"],
    queryFn: listTenantPhotos,
  });

  const addMutation = useMutation({
    mutationFn: ({ url, position }: { url: string; position: number }) =>
      addTenantPhoto(url, position),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-photos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenantPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings-photos"] }),
  });

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    // Contador local em vez de `data?.length` — a invalidação da query é
    // assíncrona e não é aguardada entre chamadas, então o cache não
    // reflete os uploads anteriores deste mesmo lote a tempo.
    let nextPosition = data?.length ?? 0;
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          setUploadError("Alguns arquivos foram ignorados por não serem imagens.");
          continue;
        }
        if (file.size > MAX_SOURCE_BYTES) {
          setUploadError("Alguma imagem era grande demais e foi ignorada.");
          continue;
        }
        const resized = await fileToResizedDataUrl(file, GALLERY_MAX_DIMENSION);
        await addMutation.mutateAsync({ url: resized, position: nextPosition });
        nextPosition += 1;
      }
    } catch {
      setUploadError("Não foi possível enviar uma das fotos. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <p className="mb-4 text-sm text-ink-500">
        Fotos exibidas no perfil público da barbearia pro cliente.
      </p>

      {canEdit && (
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-60"
          >
            <ImagePlus size={14} strokeWidth={2.5} />
            {uploading ? "Enviando..." : "Adicionar fotos"}
          </button>
          {uploadError && <p className="field-error">{uploadError}</p>}
        </div>
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
