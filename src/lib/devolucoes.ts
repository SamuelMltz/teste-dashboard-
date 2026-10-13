export type DevolucaoStatus = "pendente" | "em_analise" | "aprovada" | "finalizada";
export type DevolucaoCondicao = "em_analise" | "apto" | "avariado";

export const STATUS_ROTULO: Record<DevolucaoStatus, string> = { pendente: "Pendente", em_analise: "Em análise", aprovada: "Aprovada para estoque", finalizada: "Finalizada" };
export const CONDICAO_ROTULO: Record<DevolucaoCondicao, string> = { apto: "Apto para revenda", avariado: "Avariado", em_analise: "Em análise" };

type Base = { status: DevolucaoStatus; condicao: DevolucaoCondicao; estoque_lancado_at: string | null };

/** Só produtos aptos, aprovados e ainda não lançados podem voltar ao estoque físico. */
export const podeLancarEstoque = (d: Base) => d.condicao === "apto" && d.status === "aprovada" && !d.estoque_lancado_at;

/** Status que o usuário pode escolher manualmente para a devolução. */
export function statusPermitidos(d: Base): DevolucaoStatus[] {
  if (d.estoque_lancado_at) return ["finalizada"];
  const lista: DevolucaoStatus[] = ["pendente", "em_analise"];
  if (d.condicao === "apto") lista.push("aprovada");
  else lista.push("finalizada"); // avariado/sem conferência encerram sem entrar no estoque
  return lista;
}

export function origensDevolucao(empresas: { nome: string }[]) {
  return [...empresas.map((e) => `Mercado Livre — ${e.nome}`), "Cliente direto", "Transportadora", "Outro"];
}
