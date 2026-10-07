import type { LinhaPdf } from "./pdf-import";

export type Pendente = LinhaPdf & { opcoes: string[] };
type ProdutoBase = { id: string; cod: string; codigo: string };

const norm = (s: string) => s.trim().toLowerCase();

/** Casa linhas do PDF com produtos: COD exato primeiro, depois SKU exato. Dúvidas e não encontrados viram pendentes. */
export function casarLinhas(linhas: LinhaPdf[], produtos: ProdutoBase[]) {
  const casados = new Map<string, number>();
  const pendentes: Pendente[] = [];
  for (const l of linhas) {
    if (l.sku !== undefined) {
      // Mercado Livre: só SKU exato; o nome nunca vincula sozinho (evita trocar variantes).
      const alvoSku = norm(l.sku);
      const achados = alvoSku ? produtos.filter((p) => norm(p.codigo) === alvoSku) : [];
      const unico = achados[0];
      if (achados.length === 1 && unico && l.quantidade > 0) casados.set(unico.id, (casados.get(unico.id) ?? 0) + l.quantidade);
      else pendentes.push({ ...l, opcoes: achados.map((p) => p.id) });
      continue;
    }
    const alvo = norm(l.cod);
    if (!alvo) { pendentes.push({ ...l, opcoes: [] }); continue; }
    let achados = produtos.filter((p) => norm(p.cod) === alvo);
    if (achados.length === 0) achados = produtos.filter((p) => norm(p.codigo) === alvo);
    const unico = achados[0];
    if (achados.length === 1 && unico) casados.set(unico.id, (casados.get(unico.id) ?? 0) + l.quantidade);
    else pendentes.push({ ...l, opcoes: achados.map((p) => p.id) });
  }
  return { casados: Array.from(casados, ([produtoId, quantidade]) => ({ produtoId, quantidade })), pendentes };
}

/** Assinatura estável do conteúdo do PDF, para avisar sobre importações repetidas. */
export function assinaturaLinhas(linhas: LinhaPdf[]) {
  return linhas.map((l) => `${norm(l.cod || l.sku || l.codigoMl || "")}:${l.quantidade}`).sort().join("|");
}
