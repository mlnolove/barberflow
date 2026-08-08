/**
 * Combina uma data (YYYY-MM-DD) e hora (HH:mm) locais num ISO 8601 com o
 * offset local explícito (ex.: "2026-08-10T10:00:00-03:00"), em vez de
 * converter para UTC. O backend interpreta o horário como horário local da
 * barbearia ao validar contra o horário de funcionamento — por isso o
 * offset precisa refletir a hora de parede escolhida pelo usuário.
 */
export function toLocalISOString(date: string, time: string): string {
  const naive = new Date(`${date}T${time}:00`);
  const offsetMinutes = -naive.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${date}T${time}:00${sign}${hh}:${mm}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Segunda=0 ... Domingo=6, mesma convenção usada no backend. */
function isoWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function getDayRange(dateStr: string): { start: Date; end: Date } {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function getWeekRange(dateStr: string): { start: Date; end: Date } {
  const base = new Date(`${dateStr}T00:00:00`);
  const start = new Date(base);
  start.setDate(start.getDate() - isoWeekday(base));
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function getMonthRange(dateStr: string): { start: Date; end: Date } {
  const base = new Date(`${dateStr}T00:00:00`);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return { start, end };
}

export function toDateInputValue(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
