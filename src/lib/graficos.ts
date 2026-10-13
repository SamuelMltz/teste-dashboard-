/** Prepara as fatias por marca a partir das linhas já filtradas por empresa. */
export type Fatia = { nome: string; valor: number; percentual: number };
export type EstoquePizza = "fisico" | "full" | "ambos";

/**
 * Itens sem valor numérico (null), com valor não finito ou zerado ficam de fora —
 * nada é inventado para preencher o gráfico.
 */
export function prepararFatias<T extends { marca: string; marcaNome?: string; fisico: number | null; full: number | null }>(
  linhas: T[],
  estoque: EstoquePizza,
): { fatias: Fatia[]; total: number } {
  const marcas = new Map<string, { nome: string; valor: number }>();
  for (const linha of linhas) {
    const quantidade = (valor: number | null) => typeof valor === "number" && Number.isFinite(valor) && valor > 0 ? valor : 0;
    const valor = estoque === "ambos" ? quantidade(linha.fisico) + quantidade(linha.full) : quantidade(linha[estoque]);
    if (valor <= 0) continue;
    const grupo = marcas.get(linha.marca) ?? { nome: linha.marcaNome || linha.marca, valor: 0 };
    grupo.valor += valor;
    marcas.set(linha.marca, grupo);
  }

  const valores = [...marcas.values()];
  const total = valores.reduce((soma, v) => soma + v.valor, 0);
  const fatias = valores.map((v) => ({
    ...v,
    percentual: total > 0 ? Math.round((v.valor / total) * 1000) / 10 : 0,
  }));

  return { fatias, total };
}
