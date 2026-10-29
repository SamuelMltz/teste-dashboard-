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

export type Percentuais = { imposto_pct: number | null; custo_fixo_pct: number | null; ads_pct: number | null };

/** Lucro por unidade = preço promocional − custo − (imposto + custo fixo + Ads)% do preço promocional. */
export function lucroPromocional(precoVenda: number | null, custo: number | null, descontoPct: number, pct: Percentuais): { lucro: number; margem: number } | null {
  const preco = precoPromocional(precoVenda, descontoPct);
  if (preco == null || preco <= 0 || custo == null) return null;
  const taxas = (Number(pct.imposto_pct ?? 0) + Number(pct.custo_fixo_pct ?? 0) + Number(pct.ads_pct ?? 0)) / 100;
  const lucro = Math.round((preco - custo - preco * taxas) * 100) / 100;
  return { lucro, margem: Math.round((lucro / preco) * 1000) / 10 };
}

/** Lucro de um anúncio do ML no preço atual: preço − custo − (imposto + custo fixo + Ads)% do preço. */
export function lucroAnuncio(preco: number | null, custo: number | null, pct: Percentuais): { lucro: number; margem: number } | null {
  return lucroPromocional(preco, custo, 0, pct);
}

/** Matiz do gradiente da margem: 0% ou menos = vermelho (0), 30% ou mais = verde (130). */
export function matizMargem(margem: number): number {
  const t = Math.min(Math.max(margem / 30, 0), 1);
  return Math.round(t * 130);
}
