import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, X } from "lucide-react";

import { listFavorites, removeFavorite } from "@/api/clientFavorites";
import { ClientTopBar } from "@/components/client/ClientTopBar";

export function FavoritesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["client-favorites"], queryFn: listFavorites });

  const removeMutation = useMutation({
    mutationFn: (tenantId: string) => removeFavorite(tenantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-favorites"] }),
  });

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar title="Favoritos" onBack={() => navigate(-1)} />
      <div className="flex-1 px-5 pb-6">
        {data?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Heart size={28} className="text-ink-600" />
            <p className="text-sm text-ink-500">Você ainda não favoritou nenhuma barbearia.</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {data?.map((f) => (
            <div key={f.tenant_id} className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-ink-900 p-3">
              <button
                onClick={() => navigate(`/c/barbearia/${f.tenant_id}`)}
                className="flex flex-1 items-center gap-4 text-left"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                  {f.logo_url && <img src={f.logo_url} alt={f.name} className="h-full w-full object-cover" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.name}</p>
                  {f.city && <p className="text-xs text-ink-600">{f.city}</p>}
                </div>
              </button>
              <button
                onClick={() => removeMutation.mutate(f.tenant_id)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08]"
              >
                <X size={13} className="text-ink-500" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
