import { describe, expect, it } from "vitest";

import {
  getDayRange,
  getMonthRange,
  getWeekRange,
  toDateInputValue,
  toLocalISOString,
} from "@/lib/datetime";

describe("getDayRange", () => {
  it("cobre exatamente as 24h do dia informado", () => {
    const { start, end } = getDayRange("2026-08-25");
    expect(start.toISOString().slice(0, 10)).toBe("2026-08-25");
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("getWeekRange", () => {
  it("começa na segunda-feira quando a data é uma terça", () => {
    // 2026-08-25 é uma terça-feira
    const { start, end } = getWeekRange("2026-08-25");
    expect(start.getDay()).toBe(1); // segunda
    expect(toDateInputValue(start)).toBe("2026-08-24");
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("quando a data já é segunda-feira, a semana começa nela mesma", () => {
    const { start } = getWeekRange("2026-08-24");
    expect(toDateInputValue(start)).toBe("2026-08-24");
  });

  it("quando a data é domingo, a semana começa na segunda anterior", () => {
    const { start } = getWeekRange("2026-08-30"); // domingo
    expect(start.getDay()).toBe(1);
    expect(toDateInputValue(start)).toBe("2026-08-24");
  });
});

describe("getMonthRange", () => {
  it("cobre do primeiro dia do mês ao primeiro dia do mês seguinte", () => {
    const { start, end } = getMonthRange("2026-08-25");
    expect(toDateInputValue(start)).toBe("2026-08-01");
    expect(toDateInputValue(end)).toBe("2026-09-01");
  });

  it("vira o ano corretamente em dezembro", () => {
    const { end } = getMonthRange("2026-12-10");
    expect(toDateInputValue(end)).toBe("2027-01-01");
  });
});

describe("toDateInputValue", () => {
  it("formata como YYYY-MM-DD com zero à esquerda", () => {
    expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("toLocalISOString", () => {
  it("mantém a hora de parede escolhida, com o offset local explícito", () => {
    const iso = toLocalISOString("2026-08-25", "14:30");
    expect(iso.startsWith("2026-08-25T14:30:00")).toBe(true);
    // Reconstruir a partir do ISO deve devolver a mesma hora de parede,
    // não uma convertida para UTC.
    const parsed = new Date(iso);
    expect(parsed.getHours()).toBe(14);
    expect(parsed.getMinutes()).toBe(30);
  });
});
