import { create } from "zustand";

import type { AuthResponse, Tenant, User } from "@/types/auth";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  setAuth: (data: AuthResponse) => void;
  setAccessToken: (token: string) => void;
  setTenant: (tenant: Tenant) => void;
  clear: () => void;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  tenant: null,
  isAuthenticated: false,
  setAuth: (data) =>
    set({
      accessToken: data.access_token,
      user: data.user,
      tenant: data.tenant,
      // Reforço defensivo: só considera autenticado se a resposta realmente
      // trouxer usuário e token. Evita marcar isAuthenticated=true a partir
      // de uma resposta malformada (ver assertJsonResponse em lib/api.ts).
      isAuthenticated: Boolean(data.access_token && data.user),
    }),
  setAccessToken: (token) => set({ accessToken: token, isAuthenticated: true }),
  setTenant: (tenant) => set({ tenant }),
  clear: () => set({ accessToken: null, user: null, tenant: null, isAuthenticated: false }),
  hasPermission: (code) => get().user?.permissions.includes(code) ?? false,
}));
