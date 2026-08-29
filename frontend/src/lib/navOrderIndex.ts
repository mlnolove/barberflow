/** Posição de uma rota na ordem de navegação — usada pra decidir a direção
 * do slide de troca de aba (comparar índice atual com o anterior). Faz
 * match exato primeiro e cai para o prefixo mais longo (ex.:
 * "/clientes/123" -> item "/clientes"), pra páginas de detalhe também
 * animarem coerentemente. */
export function navOrderIndex(pathname: string, order: string[]): number {
  const exact = order.indexOf(pathname);
  if (exact !== -1) return exact;
  let bestIndex = -1;
  let bestLength = -1;
  order.forEach((to, index) => {
    if (to !== "/" && pathname.startsWith(`${to}/`) && to.length > bestLength) {
      bestIndex = index;
      bestLength = to.length;
    }
  });
  return bestIndex;
}
