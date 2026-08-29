import { describe, expect, it } from "vitest";

import {
  ALL_APPOINTMENT_STATUSES,
  STATUS_CHIP_STYLES,
  STATUS_DOT_COLORS,
  STATUS_LABELS,
} from "@/lib/appointmentStatus";
import type { AppointmentStatus } from "@/types/appointment";

// Regressão: um mockup anterior desalinhou o número de status esperado do
// número real de chaves e quebrou a renderização — aqui garante que as
// três tabelas (rótulo, cor de chip, cor de ponto) sempre têm exatamente
// uma entrada por status listado em ALL_APPOINTMENT_STATUSES, nas duas
// direções (nada faltando, nada sobrando).
describe("catálogo de status de agendamento", () => {
  it("ALL_APPOINTMENT_STATUSES não tem duplicatas", () => {
    expect(new Set(ALL_APPOINTMENT_STATUSES).size).toBe(ALL_APPOINTMENT_STATUSES.length);
  });

  it.each([
    ["STATUS_LABELS", STATUS_LABELS],
    ["STATUS_CHIP_STYLES", STATUS_CHIP_STYLES],
    ["STATUS_DOT_COLORS", STATUS_DOT_COLORS],
  ] as [string, Record<AppointmentStatus, string>][])(
    "%s cobre exatamente os status listados em ALL_APPOINTMENT_STATUSES",
    (_name, table) => {
      const tableKeys = Object.keys(table).sort();
      const expectedKeys = [...ALL_APPOINTMENT_STATUSES].sort();
      expect(tableKeys).toEqual(expectedKeys);
    },
  );
});
