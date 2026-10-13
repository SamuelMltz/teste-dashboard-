/** Prepara as fatias de um gráfico de pizza a partir das linhas já filtradas na tela. */
export type Fatia = { nome: string; valor: number; percentual: number };

/**
 * Itens sem valor numérico (null), com valor não finito ou zerado ficam de fora —
 * nada é inventado para preencher o gráfico.
 */
export function prepararFatias<T extends { sku: string; nome: string }>(
  linhas: T[],
  chave: keyof T,
): { fatias: Fatia[]; total: number } {
  const valores: { nome: string; valor: number }[] = [];
  for (const linha of linhas) {
    const bruto = linha[chave];
    if (typeof bruto === "number" && Number.isFinite(bruto) && bruto > 0) {
      valores.push({ nome: linha.sku || linha.nome, valor: bruto });
    }
  }

  const total = valores.reduce((soma, v) => soma + v.valor, 0);
  const fatias = valores.map((v) => ({
    ...v,
    percentual: total > 0 ? Math.round((v.valor / total) * 100) : 0,
  }));

  return { fatias, total };
}
