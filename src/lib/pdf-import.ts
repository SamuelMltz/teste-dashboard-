// Leitura simples de PDFs de notas/orçamentos no navegador.
export type LinhaPdf = { cod: string; nome: string; quantidade: number };

const QTD_BR = /^\d{1,3}(\.\d{3})*,\d{1,4}$|^\d+,\d{1,4}$/;
const CODIGO = /^[A-Za-z0-9][A-Za-z0-9.\-/]{0,24}$/;

export function interpretarLinhas(linhas: string[]): LinhaPdf[] {
  const resultado: LinhaPdf[] = [];
  for (const linha of linhas) {
    const tokens = linha.trim().split(/\s+/).filter(Boolean);
    if (tokens.length < 3) continue;
    const cod = tokens[0];
    if (!CODIGO.test(cod) || !/\d/.test(cod) || cod.includes(",")) continue;
    const idx = tokens.findIndex((t, i) => i > 1 && QTD_BR.test(t));
    if (idx < 0) continue;
    let nomeTokens = tokens.slice(1, idx);
    if (nomeTokens.length > 1 && /^[A-Z]{1,3}$/.test(nomeTokens[nomeTokens.length - 1])) nomeTokens = nomeTokens.slice(0, -1);
    const nome = nomeTokens.join(" ").replace(/^[-–]\s*/, "");
    if (nome.length < 3 || !/[A-Za-zÀ-ú]{2}/.test(nome)) continue;
    const quantidade = Math.round(Number(tokens[idx].replace(/\./g, "").replace(",", ".")));
    if (!Number.isFinite(quantidade) || quantidade <= 0) continue;
    resultado.push({ cod, nome, quantidade });
  }
  // agrupa códigos repetidos
  const mapa = new Map<string, LinhaPdf>();
  for (const l of resultado) {
    const atual = mapa.get(l.cod);
    if (atual) atual.quantidade += l.quantidade; else mapa.set(l.cod, { ...l });
  }
  return Array.from(mapa.values());
}

export async function lerPdf(arquivo: File): Promise<LinhaPdf[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await arquivo.arrayBuffer() }).promise;
  const linhas: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const pagina = await doc.getPage(p);
    const conteudo = await pagina.getTextContent();
    const grupos: { y: number; itens: { x: number; s: string }[] }[] = [];
    for (const item of conteudo.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const x = item.transform[4];
      const y = item.transform[5];
      let g = grupos.find((gr) => Math.abs(gr.y - y) < 3);
      if (!g) { g = { y, itens: [] }; grupos.push(g); }
      g.itens.push({ x, s: item.str });
    }
    grupos.sort((a, b) => b.y - a.y);
    for (const g of grupos) linhas.push(g.itens.sort((a, b) => a.x - b.x).map((i) => i.s.trim()).join(" "));
  }
  return interpretarLinhas(linhas);
}
