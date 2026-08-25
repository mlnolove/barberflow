import { clientApi } from "@/lib/clientApi";
import type { ClientFavorite } from "@/types/clientFavorite";

export async function listFavorites(): Promise<ClientFavorite[]> {
  const { data } = await clientApi.get<ClientFavorite[]>("/favorites");
  return data;
}

export async function addFavorite(tenantId: string): Promise<ClientFavorite> {
  const { data } = await clientApi.post<ClientFavorite>("/favorites", { tenant_id: tenantId });
  return data;
}

export async function removeFavorite(tenantId: string): Promise<void> {
  await clientApi.delete(`/favorites/${tenantId}`);
}
