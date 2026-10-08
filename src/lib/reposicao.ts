export type SituacaoReposicao = "abaixo" | "proximo" | "ok" | "sem-referencia" | "sem-dados";

/** Full abaixo das vendas = "abaixo"; de 100% a 120% das vendas = "proximo". Dados ausentes nunca viram zero. */
export function classificarReposicao(full: number | null, vendas: number | null): SituacaoReposicao {
  if (vendas === null || vendas <= 0) return "sem-referencia";
  if (full === null) return "sem-dados";
  if (full < vendas) return "abaixo";
  if (full <= vendas * 1.2) return "proximo";
  return "ok";
}

/** Envia do físico o que falta para cobrir as vendas; o que o físico não cobre vira compra. */
export function sugerirReposicao(full: number | null, fisico: number, vendas: number | null) {
  if (full === null || vendas === null || vendas <= 0) return null;
  const falta = Math.max(0, vendas - full);
  const enviar = Math.min(Math.max(0, fisico), falta);
  return { enviar, comprar: falta - enviar };
}
