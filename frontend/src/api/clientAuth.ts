import { clientApi } from "@/lib/clientApi";
import type { ClientAuthResponse, ClientProfile } from "@/types/clientAuth";

export interface ClientLoginPayload {
  email: string;
  password: string;
}

export interface ClientSignupPayload {
  full_name: string;
  email: string;
  password: string;
  phone?: string;
}

export async function clientLogin(payload: ClientLoginPayload): Promise<ClientAuthResponse> {
  const { data } = await clientApi.post<ClientAuthResponse>("/auth/login", payload);
  return data;
}

export async function clientSignup(payload: ClientSignupPayload): Promise<ClientAuthResponse> {
  const { data } = await clientApi.post<ClientAuthResponse>("/auth/signup", payload);
  return data;
}

export async function clientLogout(): Promise<void> {
  await clientApi.post("/auth/logout");
}

export async function clientRefresh(): Promise<ClientAuthResponse> {
  const { data } = await clientApi.post<ClientAuthResponse>("/auth/refresh");
  return data;
}

export async function clientMe(): Promise<ClientProfile> {
  const { data } = await clientApi.get<ClientProfile>("/auth/me");
  return data;
}

export async function requestClientPasswordReset(email: string): Promise<void> {
  await clientApi.post("/auth/password-reset/request", { email });
}

export async function confirmClientPasswordReset(token: string, new_password: string): Promise<void> {
  await clientApi.post("/auth/password-reset/confirm", { token, new_password });
}
