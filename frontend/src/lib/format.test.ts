import { describe, expect, it } from "vitest";

import { formatMoney, formatMoneyCompact } from "@/lib/format";

describe("formatMoney", () => {
  it("formata número como BRL", () => {
    expect(formatMoney(1234.5)).toBe("R$ 1.234,50");
  });

  it("aceita string numérica", () => {
    expect(formatMoney("49.90")).toBe("R$ 49,90");
  });

  it("formata zero corretamente", () => {
    expect(formatMoney(0)).toBe("R$ 0,00");
  });
});

describe("formatMoneyCompact", () => {
  it("mantém valores abaixo de mil por extenso", () => {
    expect(formatMoneyCompact(499)).toBe("R$ 499,00");
  });

  it("abrevia valores a partir de mil em 'k'", () => {
    expect(formatMoneyCompact(2500)).toBe("R$ 2.5k");
  });
});
