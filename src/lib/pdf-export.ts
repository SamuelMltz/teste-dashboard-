import logoAsset from "@/assets/logo-4t.png.asset.json";

export type DadosPdf = {
  titulo: string;
  rotuloNumero: string;
  numero: string;
  empresa: { nome: string; endereco: string; cnpj: string };
  data: string;
  rotuloEndereco?: string;
  marcas: string[];
  itens: { cod: string; nome: string; quantidade: number }[];
  arquivo: string;
  referencia?: string | undefined;
};

export async function gerarPdf(d: DadosPdf) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const azul: [number, number, number] = [31, 58, 95];
  const W = doc.internal.pageSize.getWidth();

  let topo = 28;
  try {
    const blob = await (await fetch(logoAsset.url)).blob();
    const dataUrl = await new Promise<string>((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = erro; r.readAsDataURL(blob); });
    doc.addImage(dataUrl, "PNG", W / 2 - 14, 10, 28, 28);
    topo = 46;
  } catch { /* segue sem logo */ }
  doc.setTextColor(...azul).setFont("helvetica", "bold").setFontSize(20);
  doc.text(d.titulo, W / 2, topo, { align: "center" });
  const o = topo - 28;

  doc.setTextColor(20, 30, 50).setFontSize(14).text(d.empresa.nome, 15, 45 + o);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`${d.rotuloEndereco ?? "Endereço"}: ${d.empresa.endereco || "—"}`, 15, 52 + o);
  doc.text(`CNPJ: ${d.empresa.cnpj || "—"}`, 15, 58 + o);
  doc.text(`Data: ${d.data}`, 15, 64 + o);
  doc.setFont("helvetica", "bold").text("Marca:", 15, 71 + o);
  doc.setFont("helvetica", "normal").text(d.marcas.join(", ") || "—", 29, 71 + o);

  doc.setTextColor(110, 115, 125).setFontSize(9).text(d.rotuloNumero, W - 15, 47 + o, { align: "right" });
  doc.setTextColor(20, 30, 50).setFont("helvetica", "bold").setFontSize(14).text(d.numero, W - 15, 54 + o, { align: "right" });

  if (d.referencia) doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(110, 115, 125).text(`Ref. ${d.referencia}`, W - 15, 60 + o, { align: "right" });
  doc.setDrawColor(...azul).setLineWidth(0.6).line(15, 76 + o, W - 15, 76 + o);

  autoTable(doc, {
    startY: 82 + o,
    head: [["COD", "PRODUTO", "QUANTIDADE"]],
    body: d.itens.map((i) => [i.cod || "—", i.nome, String(i.quantidade)]),
    theme: "grid",
    headStyles: { fillColor: [230, 232, 236], textColor: [20, 30, 50], halign: "center", fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3, lineColor: [170, 175, 185] },
    columnStyles: { 0: { cellWidth: 30 }, 2: { cellWidth: 32, halign: "right" } },
    margin: { left: 15, right: 15 },
  });

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...azul);
    doc.text(`Página ${p} de ${total}`, W / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }
  doc.save(d.arquivo);
}

export type DadosPdfLista = {
  referencia: string;
  empresa: { nome: string; cnpj: string };
  data: string;
  grupos: { marca: string; itens: { sku: string; cod: string; nome: string; quantidade: number }[] }[];
  arquivo: string;
};

/** Lista de compras agrupada por marca. Não cria pedidos nem altera estoque. */
export async function gerarPdfLista(d: DadosPdfLista) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const azul: [number, number, number] = [31, 58, 95];
  const W = doc.internal.pageSize.getWidth();
  doc.setTextColor(...azul).setFont("helvetica", "bold").setFontSize(20).text("LISTA DE COMPRAS", 15, 22);
  doc.setTextColor(20, 30, 50).setFontSize(13).text(d.empresa.nome, 15, 31);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`CNPJ: ${d.empresa.cnpj || "—"}`, 15, 37);
  doc.text(`Data: ${d.data}`, 15, 43);
  doc.setFont("helvetica", "bold").setFontSize(11).text(d.referencia, W - 15, 31, { align: "right" });
  doc.setDrawColor(...azul).setLineWidth(0.6).line(15, 48, W - 15, 48);
  const body: (string | { content: string; colSpan: number; styles: object })[][] = [];
  for (const g of d.grupos) {
    body.push([{ content: `Marca: ${g.marca}`, colSpan: 4, styles: { fontStyle: "bold", fillColor: [240, 242, 246] } }]);
    for (const i of g.itens) body.push([i.sku || "—", i.cod || "—", i.nome, String(i.quantidade)]);
  }
  autoTable(doc, {
    startY: 53, head: [["SKU", "COD", "PRODUTO", "QUANTIDADE"]], body, theme: "grid",
    headStyles: { fillColor: [230, 232, 236], textColor: [20, 30, 50], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 3, lineColor: [170, 175, 185] },
    columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 28 }, 3: { cellWidth: 30, halign: "right" } },
    margin: { left: 15, right: 15 },
  });
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...azul);
    doc.text(`${d.referencia} · Página ${p} de ${total}`, W / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
  }
  doc.save(d.arquivo);
}
