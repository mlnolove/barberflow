import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "@/App";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initNative } from "@/lib/native";
import { initTheme } from "@/lib/theme";

import "./index.css";

/**
 * Rede de segurança para erros ANTES do React conseguir montar (ex.: um
 * import falhando, um erro síncrono em initTheme/initNative). Sem isso, um
 * erro nesse trecho deixa a tela em branco sem nenhuma pista — especialmente
 * grave dentro do app nativo, onde não há console do navegador pra olhar.
 */
function renderFatalError(error: unknown): void {
  const root = document.getElementById("root");
  if (!root) return;
  const message = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#020617;color:#f1f5f9;padding:24px;font-family:system-ui,sans-serif;">
      <div style="max-width:420px;">
        <h1 style="color:#f87171;font-size:18px;font-weight:600;">Falha ao iniciar o app</h1>
        <pre style="margin-top:16px;max-height:256px;overflow:auto;white-space:pre-wrap;background:#0f172a;padding:12px;border-radius:6px;font-size:12px;color:#fca5a5;">${message}</pre>
      </div>
    </div>
  `;
}

window.addEventListener("error", (event) => renderFatalError(event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) => renderFatalError(event.reason));

try {
  initTheme();
  initNative();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  });

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (error) {
  renderFatalError(error);
}
