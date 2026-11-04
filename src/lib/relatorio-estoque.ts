/** Relatório de estoque: total = físico + Full disponível; custo = total × custo unitário. Não altera nada. */
export type LinhaRelatorio = { sku: string; nome: string; total: number; custo: number | null };

export function montarRelatorio(
  produtos: { codigo: string; nome: string; estoque: number; preco_custo: number | null }[],
  full: { sku: string; quantidade: number }[],
) {
  const fullPorSku = new Map<string, number>();
  for (const f of full) {
    if (!Number.isFinite(f.quantidade) || f.quantidade < 0) throw new Error(`Registro Full inconsistente para o SKU ${f.sku}.`);
    fullPorSku.set(f.sku, (fullPorSku.get(f.sku) ?? 0) + f.quantidade);
  }
  const linhas: LinhaRelatorio[] = produtos.map((p) => {
    const total = Math.max(0, p.estoque) + (p.codigo ? fullPorSku.get(p.codigo) ?? 0 : 0);
    const custo = p.preco_custo == null ? null : Math.round(total * Number(p.preco_custo) * 100) / 100;
    return { sku: p.codigo, nome: p.nome, total, custo };
  });
  return {
    linhas,
    skus: new Set(linhas.map((l) => l.sku).filter(Boolean)).size,
    produtos: new Set(linhas.map((l) => l.nome)).size,
    unidades: linhas.reduce((s, l) => s + l.total, 0),
    custoTotal: Math.round(linhas.reduce((s, l) => s + (l.custo ?? 0), 0) * 100) / 100,
    parcial: linhas.some((l) => l.custo == null),
  };
}

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function gerarPdfEstoque(empresa: string, escopo: string, r: ReturnType<typeof montarRelatorio>) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const data = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(31, 58, 95).text("RELATÓRIO DE ESTOQUE", 15, 20);
  doc.setFontSize(12).setTextColor(20, 30, 50).text(`${empresa} · ${escopo}`, 15, 28);
  doc.setFont("helvetica", "normal").setFontSize(9).text(`Gerado em ${data}`, 15, 34);
  autoTable(doc, {
    startY: 40,
    head: [["SKU", "PRODUTO", "ESTOQUE TOTAL", "CUSTO TOTAL PRODUTO"]],
    body: r.linhas.map((l) => [l.sku || "—", l.nome, l.total.toLocaleString("pt-BR"), l.custo == null ? "Não informado" : brl(l.custo)]),
    foot: [[`${r.skus} SKUs`, `${r.produtos} produtos`, r.unidades.toLocaleString("pt-BR"), `${brl(r.custoTotal)}${r.parcial ? " (parcial)" : ""}`]],
    showHead: "everyPage", showFoot: "lastPage", theme: "grid",
    headStyles: { fillColor: [230, 232, 236], textColor: [20, 30, 50] },
    footStyles: { fillColor: [31, 58, 95], textColor: [255, 255, 255] },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 28 }, 2: { cellWidth: 28, halign: "right" }, 3: { cellWidth: 40, halign: "right" } },
    margin: { left: 15, right: 15 },
  });
  const n = doc.getNumberOfPages();
  for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFontSize(8).setTextColor(110).text(`Página ${p} de ${n}`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" }); }
  const blob = doc.output("blob");
  return URL.createObjectURL(blob);
}
