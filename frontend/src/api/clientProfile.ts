import { clientApi } from "@/lib/clientApi";
import type { ClientProfile } from "@/types/clientAuth";

export interface ClientProfileUpdatePayload {
  full_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export async function getClientProfile(): Promise<ClientProfile> {
  const { data } = await clientApi.get<ClientProfile>("/me");
  return data;
}

export async function updateClientProfile(
  payload: ClientProfileUpdatePayload,
): Promise<ClientProfile> {
  const { data } = await clientApi.patch<ClientProfile>("/me", payload);
  return data;
}
