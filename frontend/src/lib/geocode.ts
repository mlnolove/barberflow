export interface GeocodeResult {
  lat: number;
  lng: number;
}

/** Geocodificação via Nominatim (OpenStreetMap) — gratuita, sem chave de
 * API. Uso ocasional (o dono clicando "marcar no mapa" ao editar o
 * endereço) está dentro do esperado para o serviço público; para volume
 * alto seria o caso de usar um provedor pago ou hospedar o próprio
 * Nominatim. */
export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Não foi possível buscar esse endereço agora.");
  }
  const data: Array<{ lat: string; lon: string }> = await response.json();
  if (data.length === 0) return null;
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}
