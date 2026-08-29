import { describe, expect, it } from "vitest";

import { navOrderIndex } from "@/lib/navOrderIndex";

const ORDER = ["/dashboard", "/agenda", "/clientes", "/financeiro", "/configuracoes"];

describe("navOrderIndex", () => {
  it("acha o índice de uma rota que bate exatamente com um item da navegação", () => {
    expect(navOrderIndex("/clientes", ORDER)).toBe(2);
  });

  it("cai para o prefixo mais longo numa página de detalhe", () => {
    expect(navOrderIndex("/clientes/123", ORDER)).toBe(2);
  });

  it("não confunde uma rota que só começa com o mesmo texto sem ser sub-rota", () => {
    // "/clientesx" não é "/clientes" nem uma sub-rota dele (falta a barra)
    expect(navOrderIndex("/clientesx", ORDER)).toBe(-1);
  });

  it("devolve -1 pra uma rota fora da navegação (ex.: /notificacoes)", () => {
    expect(navOrderIndex("/notificacoes", ORDER)).toBe(-1);
  });
});
