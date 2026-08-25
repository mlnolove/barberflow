/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-brand)",
          secondary: "var(--color-brand-secondary)",
        },
        // Identidade "Noir" — escala neutra escura usada em todo o app
        // (cliente e painel do dono), independente da cor de marca por
        // tenant acima. Nomes descrevem o papel, não o tom exato, pra não
        // prender o design a valores de hex específicos no meio do código.
        ink: {
          950: "#0C0C0B", // fundo base
          900: "#161614", // superfície de card
          800: "#222220", // superfície ativa / ícone
          700: "#2a2a28", // borda forte / divisor
          600: "#333330", // borda padrão
          500: "#4a4a44", // texto apagado / desabilitado
          400: "#7a7a72", // texto secundário
          300: "#9a9a92", // texto terciário / rótulo
        },
        gold: {
          DEFAULT: "#C8A65E",
        },
      },
      fontFamily: {
        sans: ["Switzer", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
