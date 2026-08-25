import { create } from "zustand";

import type { ClientAuthResponse, ClientProfile } from "@/types/clientAuth";

interface ClientAuthState {
  accessToken: string | null;
  client: ClientProfile | null;
  isAuthenticated: boolean;
  setAuth: (data: ClientAuthResponse) => void;
  setClient: (client: ClientProfile) => void;
  clear: () => void;
}

/**
 * Store separado de `useAuthStore` (equipe) de propósito — os dois domínios
 * de autenticação nunca compartilham token/sessão, espelhando o isolamento
 * já garantido no backend (ver app/core/deps.py: CurrentUser vs
 * CurrentClient nunca aceitam o token um do outro).
 */
export const useClientAuthStore = create<ClientAuthState>((set) => ({
  accessToken: null,
  client: null,
  isAuthenticated: false,
  setAuth: (data) =>
    set({
      accessToken: data.access_token,
      client: data.client,
      isAuthenticated: Boolean(data.access_token && data.client),
    }),
  setClient: (client) => set({ client }),
  clear: () => set({ accessToken: null, client: null, isAuthenticated: false }),
}));
