import type { jsPDF } from "jspdf";

export type ProdutoEtiqueta = { id: string; nome: string; sku: string; marca?: string; etiquetado?: boolean; full?: boolean; copias?: number };

export const LIMITE_PAGINAS = 200;

/** Valida a lista e devolve o total de páginas. Não movimenta estoque. */
export function totalPaginas(produtos: ProdutoEtiqueta[]): number {
  if (!produtos.length) throw new Error("Adicione pelo menos um produto.");
  const total = produtos.reduce((s, p) => {
    const q = p.copias ?? 1;
    if (!Number.isInteger(q) || q < 1 || q > LIMITE_PAGINAS) throw new Error("Informe de 1 a 200 cópias inteiras por produto.");
    return s + q;
  }, 0);
  if (total > LIMITE_PAGINAS) throw new Error("Gere até 200 páginas por PDF, somando todas as cópias.");
  if (produtos.some((p) => !p.nome.trim() || !p.sku.trim())) throw new Error("Todos os produtos precisam de nome e SKU cadastrados.");
  return total;
}

const PT_MM = 0.3528;

/** Escreve texto centralizado, reduzindo a fonte até caber na caixa. */
function escreverBloco(doc: jsPDF, texto: string, cx: number, topo: number, largura: number, altura: number, tamanhoMax: number) {
  let tam = tamanhoMax;
  let linhas: string[] = [];
  for (; tam >= 10; tam -= 2) {
    doc.setFontSize(tam);
    linhas = doc.splitTextToSize(texto, largura) as string[];
    if (linhas.length * tam * PT_MM * 1.15 <= altura) break;
  }
  const linhaMm = tam * PT_MM * 1.15;
  const inicio = topo + (altura - linhas.length * linhaMm) / 2 + tam * PT_MM * 0.85;
  linhas.forEach((l, i) => doc.text(l, cx, inicio + i * linhaMm, { align: "center" }));
}

export async function gerarPdfEtiquetas(produtos: ProdutoEtiqueta[]) {
  totalPaginas(produtos);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setProperties({ title: "Etiquetas de produtos" });
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight();
  const paginas = produtos.flatMap((p) => Array.from({ length: p.copias ?? 1 }, () => p));
  paginas.forEach((p, i) => {
    if (i) doc.addPage("a4", "landscape");
    doc.setTextColor(0, 0, 0).setFont("helvetica", "bold");
    const extras = [p.full && "FULL", p.etiquetado && "ETIQUETADO"].filter(Boolean) as string[];
    const altNome = extras.length === 2 ? 90 : extras.length ? 110 : 160;
    escreverBloco(doc, p.nome, w / 2, 14, w - 24, altNome, 84);
    extras.forEach((t, k) => escreverBloco(doc, t, w / 2, 14 + altNome + 6 + k * 44, w - 24, 38, 70));
    doc.setFontSize(12);
    let tam = 12;
    doc.setFontSize(tam);
    while (tam > 6 && doc.getTextWidth(p.sku) > w / 2) doc.setFontSize(--tam);
    doc.text(p.sku, w - 12, h - 10, { align: "right" });
  });
  doc.save("etiquetas-produtos.pdf");
  return paginas.length;
}
