import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.barberflow.app",
  appName: "BarberFlow",
  webDir: "dist",
  server: {
    // "https" (em vez do padrão "http") faz o WebView tratar o app como um
    // contexto seguro — necessário pro cookie de refresh (Secure) e para
    // APIs do navegador que exigem HTTPS funcionarem normalmente.
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#0F172A",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
  },
};

export default config;
