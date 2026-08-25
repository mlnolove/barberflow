import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AccountTypePage } from "@/pages/AccountTypePage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { SplashPage } from "@/pages/SplashPage";
import { ClientForgotPasswordPage } from "@/pages/client/ClientForgotPasswordPage";
import { ClientHomePage } from "@/pages/client/ClientHomePage";
import { ClientLoginPage } from "@/pages/client/ClientLoginPage";
import { ClientSignupPage } from "@/pages/client/ClientSignupPage";

function withProviders(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("telas de autenticação e home do app do cliente (fumaça)", () => {
  it("SplashPage renderiza sem erro", () => {
    render(withProviders(<SplashPage />));
    expect(screen.getByText("BarberFlow")).toBeInTheDocument();
  });

  it("OnboardingPage renderiza o primeiro passo", () => {
    render(withProviders(<OnboardingPage />));
    expect(screen.getByText("Encontre a barbearia certa")).toBeInTheDocument();
  });

  it("AccountTypePage renderiza as duas opções", () => {
    render(withProviders(<AccountTypePage />));
    expect(screen.getByText("Sou cliente")).toBeInTheDocument();
    expect(screen.getByText("Tenho uma barbearia")).toBeInTheDocument();
  });

  it("ClientLoginPage renderiza os campos e o rótulo é associado ao input", () => {
    render(withProviders(<ClientLoginPage />));
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("ClientSignupPage renderiza todos os campos do cadastro", () => {
    render(withProviders(<ClientSignupPage />));
    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Telefone (opcional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  });

  it("ClientForgotPasswordPage renderiza o formulário inicial", () => {
    render(withProviders(<ClientForgotPasswordPage />));
    expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  });

  it("ClientHomePage renderiza sem erro mesmo sem dados carregados ainda", () => {
    render(withProviders(<ClientHomePage />));
    expect(screen.getByText("Serviços populares")).toBeInTheDocument();
  });
});
