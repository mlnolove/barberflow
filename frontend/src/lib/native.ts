import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

/**
 * Ajustes que só fazem sentido dentro do app nativo (Capacitor) — em web,
 * `Capacitor.isNativePlatform()` é `false` e nada disso roda.
 */
export function initNative(): void {
  if (!Capacitor.isNativePlatform()) return;

  // Evita que o conteúdo fique desenhado por baixo da barra de status —
  // mais simples e confiável do que tratar `safe-area-inset` manualmente.
  StatusBar.setOverlaysWebView({ overlay: false });
  // "Dark" = ícones escuros, pensado pra barra de status clara (padrão do
  // app em modo claro). Não acompanha a troca de tema — ajuste fino de
  // tema do SO fica fora do escopo por ora.
  StatusBar.setStyle({ style: Style.Dark });

  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });
}
