/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL absoluta do backend (ex.: https://api.barberflow.com/api). Necessária
   * ao empacotar como app nativo (Capacitor) — não há proxy de dev nesse caso.
   * Em desenvolvimento web, deixe vazio para usar o proxy do Vite (`/api`). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
