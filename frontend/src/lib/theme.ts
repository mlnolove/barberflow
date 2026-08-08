/**
 * Sincroniza a classe `.dark` do Tailwind com a preferência de tema do
 * sistema operacional. Não há opção manual de tema claro/escuro no app;
 * por padrão, sempre segue o SO.
 */
export function initTheme(): void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  function apply(isDark: boolean) {
    document.documentElement.classList.toggle("dark", isDark);
  }

  apply(media.matches);
  media.addEventListener("change", (event) => apply(event.matches));
}

/**
 * Aplica as cores de marca do tenant (Configurações > Aparência) nas
 * custom properties que o Tailwind mapeia para `bg-brand`/`text-brand`
 * etc. Chamado sempre que o tenant é carregado ou atualizado.
 */
export function applyBrandColors(primaryColor: string, secondaryColor: string): void {
  document.documentElement.style.setProperty("--color-brand", primaryColor);
  document.documentElement.style.setProperty("--color-brand-secondary", secondaryColor);
}
