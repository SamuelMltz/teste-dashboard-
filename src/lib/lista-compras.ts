/** Regras da lista de compras do estoque físico. Cálculo determinístico, igual ao feito no servidor. */
export type ConfigReposicao = { atencaoPct: number; alvoPct: number };
export const CONFIG_PADRAO: ConfigReposicao = { atencaoPct: 120, alvoPct: 130 };

export type SituacaoFisica = "abaixo" | "proximo" | "ok" | "sem-minimo";
export type Cobertura = "a-comprar" | "parcial" | "coberto" | "sem-necessidade";

export type CalculoReposicao = {
  situacao: SituacaoFisica;
  alvo: number | null;
  necessidade: number; // alvo − físico (sem descontar pedidos)
  sugestao: number; // necessidade − pendente em pedidos abertos
  cobertura: Cobertura;
  justificativa: string;
};

export function calcularReposicao(fisico: number, minimo: number, pendente: number, cfg: ConfigReposicao = CONFIG_PADRAO): CalculoReposicao {
  if (!minimo || minimo <= 0) return { situacao: "sem-minimo", alvo: null, necessidade: 0, sugestao: 0, cobertura: "sem-necessidade", justificativa: "Mínimo não definido" };
  const situacao: SituacaoFisica = fisico < minimo ? "abaixo" : fisico * 100 <= minimo * cfg.atencaoPct ? "proximo" : "ok";
  const alvo = Math.ceil((minimo * cfg.alvoPct) / 100);
  if (situacao === "ok") return { situacao, alvo, necessidade: 0, sugestao: 0, cobertura: "sem-necessidade", justificativa: `Acima de ${cfg.atencaoPct}% do mínimo` };
  const necessidade = Math.max(0, alvo - fisico);
  const sugestao = Math.max(0, necessidade - Math.max(0, pendente));
  const cobertura: Cobertura = necessidade === 0 ? "sem-necessidade" : sugestao === 0 ? "coberto" : pendente > 0 ? "parcial" : "a-comprar";
  return { situacao, alvo, necessidade, sugestao, cobertura, justificativa: `Alvo ${alvo} (${cfg.alvoPct}% de ${minimo}) − físico ${fisico} − em pedidos ${pendente} = ${sugestao}` };
}

/** Saldo ainda não recebido de um item de pedido em aberto. */
export function saldoPendente(item: { quantidade: number; quantidade_recebida?: number | null }, status: string) {
  if (status !== "planejado") return 0;
  return Math.max(0, item.quantidade - (item.quantidade_recebida ?? 0));
}

export function referenciaLista(slug: string, agora = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(agora);
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `LC-${slug.toUpperCase().slice(0, 4)}-${v("year")}${v("month")}${v("day")}-${v("hour")}${v("minute")}`;
}

export const REF_LISTA = /\bLC-[A-Z0-9]{1,4}-\d{8}-\d{4}\b/;
export const REF_PEDIDO = /\bPED-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i;

/** Lê linhas de PDFs gerados pelo sistema (lista de compras ou pedido individual). */
export function interpretarPdfSistema(linhas: string[]) {
  const texto = linhas.join("\n");
  const lista = texto.match(REF_LISTA)?.[0] ?? null;
  const pedidoId = texto.match(REF_PEDIDO)?.[1] ?? null;
  if (!lista && !pedidoId) return null;
  const ehLista = /LISTA DE COMPRAS/i.test(texto) && !!lista;
  let marca = "";
  const itens: { sku: string; cod: string; nome: string; quantidade: number; marca: string }[] = [];
  for (const bruta of linhas) {
    const l = bruta.trim();
    const m = l.match(/^Marca:\s*(.+)$/i);
    if (m) { marca = (m[1] ?? "").trim(); continue; }
    const t = l.split(/\s+/);
    const qtd = t[t.length - 1] ?? "";
    if (t.length < (ehLista ? 4 : 3) || !/^\d+$/.test(qtd) || /^(SKU|COD|P[áa]gina)$/i.test(t[0] ?? "")) continue;
    const vazio = (s: string) => (s === "—" || s === "-" ? "" : s);
    if (ehLista) itens.push({ sku: vazio(t[0] ?? ""), cod: vazio(t[1] ?? ""), nome: t.slice(2, -1).join(" "), quantidade: Number(qtd), marca });
    else itens.push({ sku: "", cod: vazio(t[0] ?? ""), nome: t.slice(1, -1).join(" "), quantidade: Number(qtd), marca });
  }
  return { tipo: ehLista ? ("lista" as const) : ("pedido" as const), lista, pedidoId, itens: itens.filter((i) => i.quantidade > 0) };
}
