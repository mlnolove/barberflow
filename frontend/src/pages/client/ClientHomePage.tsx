import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, Calendar, Clock, MapPin, Scissors, Search, Star } from "lucide-react";

import { listMyAppointments } from "@/api/clientAppointments";
import { searchBarbershops } from "@/api/clientBarbershops";
import { listClientNotifications } from "@/api/clientNotifications";
import { formatMoney } from "@/lib/format";
import { useClientAuthStore } from "@/store/clientAuthStore";

const QUICK_SERVICES = ["Degradê", "Corte + Barba", "Barba", "Tesoura", "Sobrancelha", "Hidratação"];

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
};

export function ClientHomePage() {
  const navigate = useNavigate();
  const client = useClientAuthStore((state) => state.client);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    // Opcional e silencioso — a busca funciona igual sem localização, só
    // sem ordenar/filtrar por distância (nunca é coletado por padrão).
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => undefined,
      { timeout: 5000 },
    );
  }, []);

  const { data: upcoming } = useQuery({
    queryKey: ["client-appointments", "upcoming"],
    queryFn: () => listMyAppointments("upcoming"),
  });

  const { data: nearby } = useQuery({
    queryKey: ["client-barbershops", "nearby", coords],
    queryFn: () =>
      searchBarbershops({
        latitude: coords?.latitude,
        longitude: coords?.longitude,
        limit: 8,
      }),
  });

  const nextAppointment = upcoming?.[0];

  const { data: notifications } = useQuery({
    queryKey: ["client-notifications"],
    queryFn: () => listClientNotifications(1, 20),
  });
  const hasUnreadNotifications = notifications?.items.some((n) => !n.read_at) ?? false;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-5 pb-3 pt-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-ink-600">Olá</p>
          <h2 className="font-serif text-lg font-semibold text-white">
            {client?.full_name ?? "Cliente"}
          </h2>
        </div>
        <button
          onClick={() => navigate("/c/notificacoes")}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-ink-900"
        >
          <Bell size={16} className="text-ink-300" />
          {hasUnreadNotifications && (
            <div className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" />
          )}
        </button>
      </div>

      <div className="mb-5 px-5">
        <button
          onClick={() => navigate("/c/busca")}
          className="flex h-12 w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-900 px-4"
        >
          <Search size={15} className="text-ink-600" />
          <span className="text-sm text-ink-600">Barbearia, barbeiro, serviço...</span>
        </button>
      </div>

      {nextAppointment && (
        <div className="mb-6 px-5">
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-[#1a1510] to-[#201c13] p-5">
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-gold opacity-15" />
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="mb-1 text-[9px] uppercase tracking-widest text-gold/70">
                  Próximo agendamento
                </p>
                <h3 className="font-semibold text-white">{nextAppointment.barbershop.name}</h3>
              </div>
              <span className="rounded-full border border-emerald-800/40 bg-emerald-900/40 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                {STATUS_LABEL[nextAppointment.status]}
              </span>
            </div>
            <div className="mb-4 flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-ink-400">
                <Calendar size={11} className="text-gold" />
                <span>
                  {new Date(nextAppointment.starts_at).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-ink-400">
                <Clock size={11} className="text-gold" />
                <span>
                  {new Date(nextAppointment.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-white">{nextAppointment.employee.full_name}</p>
                <p className="text-[10px] text-ink-400">{nextAppointment.service.name}</p>
              </div>
              <span className="font-mono text-sm font-semibold text-gold">
                {formatMoney(nextAppointment.price)}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between px-5">
          <h3 className="text-sm font-semibold text-white">
            {coords ? "Perto de você" : "Barbearias"}
          </h3>
          <button onClick={() => navigate("/c/busca")} className="text-xs text-gold">
            Ver todas
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto px-5">
          {nearby?.items.map((shop) => (
            <button
              key={shop.id}
              onClick={() => navigate(`/c/barbearia/${shop.id}`)}
              className="w-44 shrink-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 text-left"
            >
              <div className="relative h-24 bg-ink-800">
                {shop.logo_url && (
                  <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
                )}
                {shop.is_open_now === false && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink-950/65">
                    <span className="rounded-full bg-ink-800 px-2 py-0.5 text-[9px] font-medium text-white">
                      Fechado
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-xs font-semibold text-white">{shop.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Star size={9} className="fill-gold text-gold" />
                    <span className="text-[10px] text-ink-400">
                      {shop.min_price ? formatMoney(shop.min_price) : "—"}
                    </span>
                  </div>
                  {shop.distance_km !== null && (
                    <span className="text-[10px] text-ink-600">{shop.distance_km.toFixed(1)} km</span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {nearby && nearby.items.length === 0 && (
            <div className="flex w-full flex-col items-center gap-2 py-10 text-center">
              <MapPin size={22} className="text-ink-600" />
              <p className="text-xs text-ink-500">Nenhuma barbearia encontrada por perto ainda.</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-5">
        <h3 className="mb-3 text-sm font-semibold text-white">Serviços populares</h3>
        <div className="grid grid-cols-3 gap-2">
          {QUICK_SERVICES.map((svc) => (
            <button
              key={svc}
              onClick={() => navigate(`/c/busca?q=${encodeURIComponent(svc)}`)}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/[0.06] bg-ink-900 p-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800">
                <Scissors size={14} className="text-gold" strokeWidth={1.5} />
              </div>
              <span className="text-center text-[10px] font-medium leading-tight text-white">{svc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
