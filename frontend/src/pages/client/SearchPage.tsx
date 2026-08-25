import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Search, Star, X } from "lucide-react";

import { searchBarbershops } from "@/api/clientBarbershops";
import { formatMoney } from "@/lib/format";

const RECENT_SEARCHES_KEY = "barberflow.recent_searches";
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const next = [trimmed, ...readRecent().filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [useLocation, setUseLocation] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      const timer = setTimeout(() => {
        pushRecent(query);
        setRecent(readRecent());
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [query]);

  function toggleLocation() {
    if (useLocation) {
      setUseLocation(false);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setUseLocation(true);
      },
      () => undefined,
    );
  }

  const { data, isLoading } = useQuery({
    queryKey: ["client-barbershops", "search", query, useLocation ? coords : null],
    queryFn: () =>
      searchBarbershops({
        q: query.trim() || undefined,
        latitude: useLocation ? coords?.latitude : undefined,
        longitude: useLocation ? coords?.longitude : undefined,
        limit: 30,
      }),
    enabled: query.trim().length > 0 || useLocation,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <div className="px-5 pb-3 pt-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 flex-1 items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-900 px-4">
            <Search size={15} className="text-ink-600" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Barbearia, barbeiro, serviço..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ink-600"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X size={13} className="text-ink-600" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={toggleLocation}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-all"
          style={{
            background: useLocation ? "#C8A65E" : "transparent",
            color: useLocation ? "#0C0C0B" : "#7a7a72",
            borderColor: useLocation ? "transparent" : "rgba(255,255,255,0.1)",
          }}
        >
          <MapPin size={11} />
          Perto de mim
        </button>
      </div>

      <div className="flex-1 px-5 pb-6">
        {!query && !useLocation ? (
          <div className="pt-2">
            {recent.length > 0 && (
              <p className="mb-3 text-[10px] uppercase tracking-widest text-ink-600">Recentes</p>
            )}
            {recent.map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="flex w-full items-center gap-3 border-b border-white/[0.05] py-3 text-left"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-800">
                  <Search size={13} className="text-ink-600" />
                </div>
                <span className="text-sm text-white">{term}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-2">
            {isLoading && <p className="py-10 text-center text-sm text-ink-500">Buscando...</p>}
            {data?.items.map((shop) => (
              <button
                key={shop.id}
                onClick={() => navigate(`/c/barbearia/${shop.id}`)}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-ink-900 p-3 text-left"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-800">
                  {shop.logo_url && (
                    <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{shop.name}</p>
                  {shop.min_price && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <Star size={9} className="fill-gold text-gold" />
                      <span className="text-xs text-ink-400">
                        A partir de {formatMoney(shop.min_price)}
                      </span>
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-1.5">
                    {shop.city && <span className="text-xs text-ink-600">{shop.city}</span>}
                    {shop.distance_km !== null && (
                      <span className="text-xs text-ink-600">· {shop.distance_km.toFixed(1)} km</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {data && data.items.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-ink-900">
                  <Search size={22} className="text-ink-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Nenhum resultado</p>
                  <p className="mt-1 text-xs text-ink-600">Tente outro nome ou termo</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
