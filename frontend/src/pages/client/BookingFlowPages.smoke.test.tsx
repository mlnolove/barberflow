import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { BarberSelectPage } from "@/pages/client/BarberSelectPage";
import { BarbershopProfilePage } from "@/pages/client/BarbershopProfilePage";
import { BookingConfirmPage } from "@/pages/client/BookingConfirmPage";
import { DateTimePage } from "@/pages/client/DateTimePage";
import { SearchPage } from "@/pages/client/SearchPage";
import { ServiceSelectPage } from "@/pages/client/ServiceSelectPage";

function renderAtRoute(path: string, routePattern: string, element: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={routePattern} element={element} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("telas do fluxo de agendamento do cliente (fumaça)", () => {
  it("SearchPage renderiza sem erro", () => {
    renderAtRoute("/c/busca", "/c/busca", <SearchPage />);
    expect(screen.getByPlaceholderText("Barbearia, barbeiro, serviço...")).toBeInTheDocument();
  });

  it("BarbershopProfilePage renderiza enquanto os dados carregam", () => {
    renderAtRoute("/c/barbearia/abc", "/c/barbearia/:tenantId", <BarbershopProfilePage />);
    // Sem backend disponível no teste, a página mostra o estado de
    // carregamento (tela vazia) em vez de quebrar — é o que garantimos aqui.
  });

  it("BarberSelectPage renderiza sem erro", () => {
    renderAtRoute("/c/barbearia/abc/barbeiro", "/c/barbearia/:tenantId/barbeiro", <BarberSelectPage />);
    expect(screen.getByText("Continuar")).toBeInTheDocument();
  });

  it("ServiceSelectPage renderiza sem erro", () => {
    renderAtRoute("/c/barbearia/abc/servico", "/c/barbearia/:tenantId/servico", <ServiceSelectPage />);
    expect(screen.getByText("Selecione um serviço")).toBeInTheDocument();
  });

  it("DateTimePage renderiza sem erro", () => {
    renderAtRoute("/c/barbearia/abc/horario", "/c/barbearia/:tenantId/horario", <DateTimePage />);
    expect(screen.getByText("Horários disponíveis")).toBeInTheDocument();
  });

  it("BookingConfirmPage renderiza sem erro", () => {
    renderAtRoute("/c/barbearia/abc/confirmar", "/c/barbearia/:tenantId/confirmar", <BookingConfirmPage />);
    expect(screen.getByRole("button", { name: "Confirmar agendamento" })).toBeInTheDocument();
  });
});
