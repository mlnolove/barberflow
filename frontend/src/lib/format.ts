export function formatMoney(value: string | number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatMoneyCompact(value: string | number): string {
  const n = Number(value);
  if (n >= 1000) return `R$ ${(n / 1000).toFixed(1)}k`;
  return formatMoney(n);
}
