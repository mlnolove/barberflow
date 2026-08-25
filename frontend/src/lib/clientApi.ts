import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

import { useClientAuthStore } from "@/store/clientAuthStore";
import type { ClientAuthResponse } from "@/types/clientAuth";

/**
 * Mesma base do painel da equipe (`lib/api.ts`), só que apontando pro
 * namespace `/client` do backend — os dois domínios de auth nunca se
 * misturam (ver `store/clientAuthStore.ts`).
 */
const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api") + "/client";

function assertJsonResponse(response: AxiosResponse): AxiosResponse {
  const contentType = response.headers?.["content-type"];
  if (typeof contentType === "string" && !contentType.includes("application/json")) {
    throw new axios.AxiosError(
      "Resposta inesperada do servidor (backend inalcançável ou mal configurado).",
      "ERR_BAD_RESPONSE",
      response.config,
      response.request,
      response,
    );
  }
  return response;
}

export const clientApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10_000,
});

clientApi.interceptors.request.use((config) => {
  const token = useClientAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const response = await axios.post<ClientAuthResponse>(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true, timeout: 10_000 },
  );
  const { data } = assertJsonResponse(response);
  useClientAuthStore.getState().setAuth(data);
  return data.access_token;
}

clientApi.interceptors.response.use(
  (response) => assertJsonResponse(response),
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthEndpoint = originalRequest?.url?.startsWith("/auth/");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        refreshPromise ??= refreshAccessToken();
        const token = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return clientApi(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        useClientAuthStore.getState().clear();
        window.location.href = "/c/entrar";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
