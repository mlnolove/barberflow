import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAuthStore } from "@/store/authStore";
import type { AuthResponse } from "@/types/auth";

/**
 * No navegador (web), fica vazio e usamos o caminho relativo `/api`, que o
 * Vite reescreve em dev e o Nginx reescreve em produção (mesmo domínio).
 * Empacotado como app nativo (Capacitor), não existe esse proxy — o WebView
 * carrega de `https://localhost` e precisa da URL absoluta do backend,
 * definida em build time via `VITE_API_URL`.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // Sem isso, uma requisição pra um backend inalcançável (ex.: app nativo
  // sem VITE_API_URL configurada) fica pendurada indefinidamente — a tela
  // de carregamento inicial (App.tsx aguarda o refresh silencioso) nunca
  // sai do lugar. Com timeout, falha rápido e cai na tela de login normal.
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const { data } = await axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true, timeout: 10_000 },
  );
  useAuthStore.getState().setAuth(data);
  return data.access_token;
}

api.interceptors.response.use(
  (response) => response,
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
        return api(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        useAuthStore.getState().clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
