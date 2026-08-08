import { api } from "@/lib/api";
import type { AuthResponse } from "@/types/auth";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  tenant_name: string;
  owner_full_name: string;
  owner_email: string;
  owner_password: string;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/login", payload);
  return data;
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/signup", payload);
  return data;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function refresh(): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>("/auth/refresh");
  return data;
}
