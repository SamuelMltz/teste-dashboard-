/** Cálculos puros das promoções (sem acesso ao banco). */
export const MARGEM_MINIMA_PCT = 15;

export function precoPromocional(precoVenda: number | null, descontoPct: number): number | null {
  if (precoVenda == null || precoVenda <= 0) return null;
  return Math.round(precoVenda * (1 - descontoPct / 100) * 100) / 100;
}

/** Margem = (preço promocional − custo) ÷ preço promocional × 100. */
export function margemPromocional(precoVenda: number | null, custo: number | null, descontoPct: number): number | null {
  const preco = precoPromocional(precoVenda, descontoPct);
  if (preco == null || preco <= 0 || custo == null) return null;
  return Math.round(((preco - custo) / preco) * 1000) / 10;
}

export type NivelMargem = "boa" | "baixa" | "negativa" | "sem-dados";
export function nivelMargem(margem: number | null): NivelMargem {
  if (margem == null) return "sem-dados";
  if (margem < 0) return "negativa";
  if (margem < MARGEM_MINIMA_PCT) return "baixa";
  return "boa";
}

export type StatusPromocao = "agendada" | "ativa" | "encerrada";
export function statusPromocao(p: { data_inicio: string; data_fim: string; encerrada: boolean }, hoje: string): StatusPromocao {
  if (p.encerrada || p.data_fim < hoje) return "encerrada";
  if (p.data_inicio > hoje) return "agendada";
  return "ativa";
}
