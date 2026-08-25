import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Heart, MapPin, MessageCircle, Scissors } from "lucide-react";

import { getBarbershop } from "@/api/clientBarbershops";
import { startConversation } from "@/api/clientConversations";
import { addFavorite, listFavorites, removeFavorite } from "@/api/clientFavorites";
import { formatMoney } from "@/lib/format";
import { useBookingFlowStore } from "@/store/bookingFlowStore";

const WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

export function BarbershopProfilePage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resetBooking = useBookingFlowStore((s) => s.reset);

  const { data: shop } = useQuery({
    queryKey: ["client-barbershop", tenantId],
    queryFn: () => getBarbershop(tenantId!),
    enabled: Boolean(tenantId),
  });

  const { data: favorites } = useQuery({
    queryKey: ["client-favorites"],
    queryFn: listFavorites,
  });
  const isFavorited = favorites?.some((f) => f.tenant_id === tenantId) ?? false;

  const favoriteMutation = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await removeFavorite(tenantId!);
      } else {
        await addFavorite(tenantId!);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["client-favorites"] }),
  });

  const messageMutation = useMutation({
    mutationFn: () => startConversation(tenantId!),
    onSuccess: (conversation) => navigate(`/c/mensagens/${conversation.id}`),
  });

  if (!shop) {
    return <div className="min-h-screen bg-ink-950" />;
  }

  const coverPhoto = shop.photos[0]?.url ?? shop.logo_url;

  return (
    <div className="relative min-h-screen bg-ink-950 pb-28">
      <div className="relative h-64 overflow-hidden bg-ink-900">
        {coverPhoto && <img src={coverPhoto} alt={shop.name} className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-transparent" />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 pt-11">
        <button
          onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-black/45 backdrop-blur-sm"
        >
          <ArrowLeft size={17} className="text-white" />
        </button>
        <button
          onClick={() => favoriteMutation.mutate()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-black/45 backdrop-blur-sm"
        >
          <Heart size={17} className={isFavorited ? "fill-red-400 text-red-400" : "text-white"} />
        </button>
      </div>

      <div className="px-5 pt-5">
        <h1 className="font-serif text-2xl text-white">{shop.name}</h1>
        {shop.description && <p className="mt-2 text-sm leading-relaxed text-ink-400">{shop.description}</p>}

        <div className="mb-6 mt-4 flex flex-wrap gap-2">
          {shop.address && (
            <div className="flex items-center gap-1.5 rounded-lg bg-ink-900 px-3 py-2 text-xs text-ink-400">
              <MapPin size={11} className="text-gold" />
              <span>{shop.address}</span>
            </div>
          )}
        </div>

        {shop.services.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-white">Serviços</h3>
            <div className="flex flex-col">
              {shop.services.map((sv) => (
                <div key={sv.id} className="flex items-center justify-between border-b border-white/[0.05] py-3">
                  <div>
                    <span className="text-sm text-white">{sv.name}</span>
                    <p className="text-xs text-ink-600">{sv.duration_minutes} min</p>
                  </div>
                  <span className="font-mono text-sm font-semibold text-gold">{formatMoney(sv.price)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {shop.barbers.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-white">Barbeiros</h3>
            <div className="flex gap-4 overflow-x-auto">
              {shop.barbers.map((b) => (
                <div key={b.id} className="flex w-20 shrink-0 flex-col items-center gap-2 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink-700 bg-ink-800">
                    <Scissors size={18} className="text-ink-600" />
                  </div>
                  <p className="text-[10px] font-medium text-white">{b.full_name.split(" ")[0]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {shop.business_hours.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-white">
              <Clock size={13} className="text-gold" />
              Funcionamento
            </h3>
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-ink-900 p-4">
              {shop.business_hours.map((bh) => (
                <div key={bh.id} className="flex items-center justify-between text-xs">
                  <span className="text-ink-400">{WEEKDAY_LABELS[bh.weekday]}</span>
                  <span className="text-white">
                    {bh.is_open ? `${bh.open_time?.slice(0, 5)} – ${bh.close_time?.slice(0, 5)}` : "Fechado"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-white/[0.06] bg-ink-950/95 px-5 pb-8 pt-4 backdrop-blur-md">
        <button
          onClick={() => messageMutation.mutate()}
          disabled={messageMutation.isPending}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/[0.1] text-white disabled:opacity-40"
        >
          <MessageCircle size={18} />
        </button>
        <button
          onClick={() => {
            if (shop.scheduling_mode === "QUEUE") {
              navigate(`/c/barbearia/${tenantId}/fila`);
              return;
            }
            resetBooking();
            navigate(`/c/barbearia/${tenantId}/barbeiro`);
          }}
          disabled={
            shop.services.length === 0 || (shop.scheduling_mode === "TIME_SLOT" && shop.barbers.length === 0)
          }
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gold text-sm font-semibold text-ink-950 disabled:opacity-40"
        >
          <Scissors size={16} strokeWidth={1.5} />
          {shop.scheduling_mode === "QUEUE" ? "Entrar na fila" : "Agendar corte"}
        </button>
      </div>
    </div>
  );
}
