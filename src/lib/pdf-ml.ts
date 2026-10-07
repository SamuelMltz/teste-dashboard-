// Leitor da "Lista de produtos e instruções de preparação" (envios Full do Mercado Livre).
import type { LinhaPdf } from "./pdf-import";

export type ItemPdf = { p: number; x: number; y: number; s: string };
export type CabecalhoMl = { frete: string; totalProdutos: number | null; totalUnidades: number | null };
export type LeituraMl = { cabecalho: CabecalhoMl; linhas: LinhaPdf[] };

const ML = /C[óo]digo ML:/i;

export function ehListaMl(itens: ItemPdf[]) {
  const texto = itens.map((i) => i.s).join(" ");
  return /Frete\s*#\s*\d+/i.test(texto) && ML.test(texto);
}

export function interpretarMl(itens: ItemPdf[]): LeituraMl {
  const texto = itens.filter((i) => i.p === 1).sort((a, b) => b.y - a.y || a.x - b.x).map((i) => i.s).join(" ");
  const num = (re: RegExp) => { const m = texto.match(re); return m ? Number(m[1]) : null; };
  const cabecalho: CabecalhoMl = {
    frete: texto.match(/Frete\s*#\s*(\d+)/i)?.[1] ?? "",
    totalProdutos: num(/Produtos do envio:\s*(\d+)/i),
    totalUnidades: num(/Total de unidades:\s*(\d+)/i),
  };

  // Colunas pela posição dos cabeçalhos da tabela.
  const hUn = itens.find((i) => /^UNIDADES$/i.test(i.s.trim()));
  const hId = itens.find((i) => /^IDENTIF/i.test(i.s.trim()));
  const hIn = itens.find((i) => /^INSTRU[ÇC][ÕO]ES DE PREPARA/i.test(i.s.trim()));
  const xUn = hUn?.x ?? 230, xId = hId?.x ?? 285, xIn = hIn?.x ?? 370;
  const topo = new Map<number, number>(); // y do cabeçalho "PRODUTO" por página
  for (const i of itens) if (/^PRODUTO$/i.test(i.s.trim())) topo.set(i.p, Math.max(topo.get(i.p) ?? -Infinity, i.y));

  type Bloco = { p0: number; p: number; y: number; partes: string[]; ultimoY: number; qtd: number | null; ident: string[]; instr: string[] };
  const blocos: Bloco[] = [];
  const tabela = itens.filter((i) => topo.has(i.p) && i.y < topo.get(i.p)! - 1).sort((a, b) => a.p - b.p || b.y - a.y || a.x - b.x);
  let atual: Bloco | null = null;
  let primeiroDaPagina = 0;
  for (const i of tabela.filter((t) => t.x < xUn - 3)) {
    if (ML.test(i.s)) {
      atual = { p0: i.p, p: i.p, y: i.y, partes: [i.s], ultimoY: i.y, qtd: null, ident: [], instr: [] };
      blocos.push(atual); primeiroDaPagina = i.p; continue;
    }
    if (!atual) continue;
    const continuaPagina = i.p !== atual.p && primeiroDaPagina !== i.p;
    if ((i.p === atual.p && atual.ultimoY - i.y < 20) || continuaPagina) {
      atual.partes.push(i.s); atual.ultimoY = i.y; if (continuaPagina) { atual.p = i.p; primeiroDaPagina = i.p; }
    }
  }
  // Quantidade e identificação: mesma faixa vertical do início de cada bloco.
  const itensBlocoPagina = (b: Bloco, p: number) => b.p0 === p;
  const doBloco = (i: ItemPdf) => {
    const naPagina = blocos.filter((b) => itensBlocoPagina(b, i.p));
    return naPagina.find((b) => b.y + 10 >= i.y && i.y > b.y - 50) ?? null;
  };
  for (const i of tabela) {
    if (i.x >= xUn - 10 && i.x < xId - 3 && /^\d+$/.test(i.s.trim())) {
      const b = blocos.filter((bl) => itensBlocoPagina(bl, i.p)).find((bl) => Math.abs(bl.y - i.y) <= 8);
      if (b && b.qtd === null) b.qtd = Number(i.s.trim());
    } else if (i.x >= xId - 3) {
      const b = doBloco(i);
      if (b) (i.x >= xIn - 3 ? b.instr : b.ident).push(i.s.trim());
    }
  }

  const mapa = new Map<string, LinhaPdf>();
  for (const b of blocos) {
    const t = b.partes.join(" ").replace(/\s+/g, " ").trim();
    const codigoMl = t.match(/C[óo]digo ML:\s*(\S+)/i)?.[1] ?? "";
    const codigoUniversal = t.match(/C[óo]digo universal:\s*(\d{6,14})/i)?.[1] ?? "";
    const sku = t.match(/SKU:\s*(\S+)/i)?.[1] ?? "";
    const corte = t.search(/SKU:\s*\S+/i);
    let nome = corte >= 0 ? t.slice(corte).replace(/^SKU:\s*\S+\s*/i, "") : t.replace(/C[óo]digo ML:\s*\S+/i, "").replace(/C[óo]digo universal:\s*\d*/i, "");
    nome = nome.trim();
    const linha: LinhaPdf = {
      cod: "", sku, codigoMl, codigoUniversal, nome: nome || `Produto ${sku || codigoMl}`,
      quantidade: b.qtd ?? 0, identificacao: [b.ident.join(" "), b.instr.join(" ")].filter(Boolean).join(" · "),
      incerto: b.qtd === null || !sku,
    };
    const chave = sku || codigoMl;
    const existente = mapa.get(chave);
    if (existente) existente.quantidade += linha.quantidade; else mapa.set(chave, linha);
  }
  return { cabecalho, linhas: Array.from(mapa.values()) };
}
