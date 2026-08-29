import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// O bundler não resolve os ícones padrão do Leaflet via caminho relativo —
// truque padrão pra Vite/webpack: aponta pros assets já processados pelo
// import acima.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

interface AddressMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  disabled?: boolean;
}

/** Mapa OpenStreetMap (via Leaflet) com um pino arrastável — clicar no mapa
 * ou arrastar o pino atualiza a localização da barbearia. Sem Google Maps
 * porque isso exigiria uma chave de API do Google Cloud com faturamento que
 * ninguém tem configurada aqui; OSM funciona sem conta nem chave. */
export function AddressMap({ latitude, longitude, onChange, disabled }: AddressMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const hasLocation = latitude !== null && longitude !== null;
    const center: [number, number] = hasLocation ? [latitude, longitude] : BRAZIL_CENTER;
    const map = L.map(containerRef.current, {
      center,
      zoom: hasLocation ? 16 : 4,
      dragging: !disabled,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, { draggable: !disabled }).addTo(map);
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      onChangeRef.current(pos.lat, pos.lng);
    });
    if (!disabled) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mapa é montado uma vez; posição externa é sincronizada no efeito abaixo
  }, [disabled]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || latitude === null || longitude === null) return;
    const current = marker.getLatLng();
    if (Math.abs(current.lat - latitude) < 1e-6 && Math.abs(current.lng - longitude) < 1e-6) return;
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], Math.max(map.getZoom(), 15));
  }, [latitude, longitude]);

  return <div ref={containerRef} className="h-56 w-full rounded-xl border border-white/[0.08]" />;
}
