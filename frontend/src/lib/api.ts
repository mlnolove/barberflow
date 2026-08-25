import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";

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

/**
 * Dentro do app nativo, uma requisição para `/api/...` sem `VITE_API_URL`
 * configurada não vira um erro de rede — o servidor local do Capacitor
 * intercepta e devolve o próprio `index.html` (200 OK, fallback de SPA).
 * Sem essa checagem, esse HTML é aceito como se fosse a resposta da API
 * (ex.: um "login" que na verdade nunca aconteceu), e o app quebra mais
 * na frente tentando usar dados que não existem. Content-Type errado =
 * tratamos como falha de rede de verdade.
 */
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
  const response = await axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true, timeout: 10_000 },
  );
  const { data } = assertJsonResponse(response);
  useAuthStore.getState().setAuth(data);
  return data.access_token;
}

api.interceptors.response.use(
  (response) => assertJsonResponse(response),
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const isAuthEndpoint = originalRequest?.url?.startsWith("/auth/");

    // Assinatura inativa/expirada — o backend bloqueia todo o resto da API
    // (menos o próprio módulo de configurações) com 402. Manda direto pra
    // aba de assinatura em vez de deixar a tela travada num erro genérico.
    if (error.response?.status === 402 && !window.location.pathname.startsWith("/configuracoes")) {
      window.location.href = "/configuracoes?tab=subscription";
      return Promise.reject(error);
    }

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
