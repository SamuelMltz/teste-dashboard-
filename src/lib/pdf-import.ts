// Leitura simples de PDFs de notas/orçamentos no navegador.
export type LinhaPdf = {
  cod: string; nome: string; quantidade: number;
  // Campos do Mercado Livre (identificadores distintos do COD do fornecedor).
  sku?: string; codigoMl?: string; codigoUniversal?: string; identificacao?: string; incerto?: boolean;
};
import { ehListaMl, interpretarMl, type ItemPdf, type CabecalhoMl } from "./pdf-ml";

const QTD_BR = /^\d{1,3}(\.\d{3})*,\d{1,4}$|^\d+,\d{1,4}$/;
const CODIGO = /^[A-Za-z0-9][A-Za-z0-9.\-/]{0,24}$/;

export function interpretarLinhas(linhas: string[]): LinhaPdf[] {
  type Linha = { cod: string; quantidade: number; desc: string } | null;
  const analisadas: Linha[] = linhas.map((linha) => {
    const tokens = linha.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 2) return null;
    const cod = tokens[0] ?? "";
    if (!CODIGO.test(cod) || !/\d/.test(cod) || cod.includes(",")) return null;
    const idx = tokens.findIndex((t, i) => i >= 1 && QTD_BR.test(t));
    if (idx < 0) return null;
    let desc = tokens.slice(1, idx);
    if (desc.length && /^[A-Z]{1,3}$/.test(desc[desc.length - 1] ?? "")) desc = desc.slice(0, -1);
    const quantidade = Math.round(Number((tokens[idx] ?? "").replace(/\./g, "").replace(",", ".")));
    if (!Number.isFinite(quantidade) || quantidade <= 0) return null;
    return { cod, quantidade, desc: desc.join(" ") };
  });
  const limpar = (s: string) => s.replace(/\s+\d+,\d+$/, "").replace(/\s+\d$/, "").trim();
  const ignorar = /p[áa]gina|or[çc]amento|totais|c[óo]digo|descri[çc][ãa]o|:/i;
  const indices = analisadas.flatMap((a, i) => (a ? [i] : []));
  const resultado: LinhaPdf[] = indices.map((i, k) => {
    const atual = analisadas[i]!;
    const anterior = k > 0 ? (indices[k - 1] ?? -1) : Math.max(-1, i - 2);
    const proximo = k < indices.length - 1 ? (indices[k + 1] ?? linhas.length) : Math.min(linhas.length, i + 3);
    const gapAntes = linhas.slice(anterior + 1, i);
    const gapDepois = linhas.slice(i + 1, proximo);
    const prefixo = k > 0 ? gapAntes.slice(Math.ceil(gapAntes.length / 2)) : gapAntes;
    const sufixo = k < indices.length - 1 ? gapDepois.slice(0, Math.ceil(gapDepois.length / 2)) : gapDepois;
    const partes = [...prefixo, atual.desc, ...sufixo]
      .filter((l) => !ignorar.test(l))
      .map(limpar)
      .filter((l) => /[A-Za-zÀ-ú]{2}/.test(l));
    return { cod: atual.cod, quantidade: atual.quantidade, nome: partes.join(" ").replace(/\s+/g, " ").trim() || `Produto ${atual.cod}` };
  });
  // agrupa códigos repetidos
  const mapa = new Map<string, LinhaPdf>();
  for (const l of resultado) {
    const atual = mapa.get(l.cod);
    if (atual) atual.quantidade += l.quantidade; else mapa.set(l.cod, { ...l });
  }
  return Array.from(mapa.values());
}

export async function lerItensPdf(arquivo: File): Promise<ItemPdf[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
  const itens: ItemPdf[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const conteudo = await (await doc.getPage(p)).getTextContent();
    for (const item of conteudo.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      itens.push({ p, x: item.transform[4], y: item.transform[5], s: item.str });
    }
  }
  return itens;
}

function agruparLinhas(itens: ItemPdf[]): string[] {
  const linhas: string[] = [];
  const paginas = Array.from(new Set(itens.map((i) => i.p))).sort((a, b) => a - b);
  for (const p of paginas) {
    const grupos: { y: number; itens: ItemPdf[] }[] = [];
    for (const it of itens.filter((i) => i.p === p)) {
      let g = grupos.find((gr) => Math.abs(gr.y - it.y) < 3);
      if (!g) { g = { y: it.y, itens: [] }; grupos.push(g); }
      g.itens.push(it);
    }
    grupos.sort((a, b) => b.y - a.y);
    for (const g of grupos) linhas.push(g.itens.sort((a, b) => a.x - b.x).map((i) => i.s.trim()).join(" "));
  }
  return linhas;
}

export type LeituraPdf = { linhas: LinhaPdf[]; ml: CabecalhoMl | null };

/** Lê o PDF e detecta automaticamente se é uma lista de envio Full do Mercado Livre. */
export async function lerDocumentoPdf(arquivo: File): Promise<LeituraPdf> {
  const itens = await lerItensPdf(arquivo);
  if (ehListaMl(itens)) { const r = interpretarMl(itens); return { linhas: r.linhas, ml: r.cabecalho }; }
  return { linhas: interpretarLinhas(agruparLinhas(itens)), ml: null };
}

export async function lerPdf(arquivo: File): Promise<LinhaPdf[]> {
  return interpretarLinhas(agruparLinhas(await lerItensPdf(arquivo)));
}

/** Linhas de texto do PDF (agrupadas por altura), para documentos emitidos pelo sistema. */
export async function lerTextoLinhas(arquivo: File): Promise<string[]> {
  return agruparLinhas(await lerItensPdf(arquivo));
}
