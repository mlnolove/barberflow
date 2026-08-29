import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AgendaPage } from "@/pages/agenda/AgendaPage";
import { CustomersListPage } from "@/pages/customers/CustomersListPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FinancialPage } from "@/pages/financial/FinancialPage";
import { SignupPage } from "@/pages/SignupPage";

function withProviders(children: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe("telas principais da conta de barbearia (fumaça)", () => {
  it("AgendaPage renderiza o cabeçalho e o seletor de visão", () => {
    render(withProviders(<AgendaPage />));
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.getByText("Dia")).toBeInTheDocument();
    expect(screen.getByText("Semana")).toBeInTheDocument();
    expect(screen.getByText("Mês")).toBeInTheDocument();
  });

  it("CustomersListPage renderiza o cabeçalho e os filtros de status", () => {
    render(withProviders(<CustomersListPage />));
    expect(screen.getByText("Clientes")).toBeInTheDocument();
    expect(screen.getByText("Ativos")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Buscar por nome, telefone ou e-mail")).toBeInTheDocument();
  });

  it("FinancialPage renderiza o cabeçalho e os atalhos de período", () => {
    render(withProviders(<FinancialPage />));
    expect(screen.getByText("Financeiro")).toBeInTheDocument();
    expect(screen.getByText("7 dias")).toBeInTheDocument();
    expect(screen.getByText("Este mês")).toBeInTheDocument();
  });

  it("DashboardPage renderiza sem permissão de relatórios (versão simplificada)", () => {
    render(withProviders(<DashboardPage />));
    expect(screen.getByText("Seus atendimentos de hoje")).toBeInTheDocument();
  });

  it("SignupPage renderiza os campos e a lista de planos", () => {
    render(withProviders(<SignupPage />));
    expect(screen.getByText("Crie sua barbearia")).toBeInTheDocument();
    expect(screen.getByText("Nome da barbearia")).toBeInTheDocument();
    expect(screen.getByText("Escolha seu plano")).toBeInTheDocument();
  });
});
