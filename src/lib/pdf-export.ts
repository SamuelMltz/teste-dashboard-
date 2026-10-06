export type DadosPdf = {
  titulo: string;
  rotuloNumero: string;
  numero: string;
  empresa: { nome: string; endereco: string; cnpj: string };
  data: string;
  marcas: string[];
  itens: { cod: string; nome: string; quantidade: number }[];
  arquivo: string;
};

export async function gerarPdf(d: DadosPdf) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const azul: [number, number, number] = [31, 58, 95];
  const W = doc.internal.pageSize.getWidth();

  doc.setTextColor(...azul).setFont("helvetica", "bold").setFontSize(20);
  doc.text(d.titulo, W / 2, 28, { align: "center" });

  doc.setTextColor(20, 30, 50).setFontSize(14).text(d.empresa.nome, 15, 45);
  doc.setFont("helvetica", "normal").setFontSize(10);
  doc.text(`Endereço: ${d.empresa.endereco || "—"}`, 15, 52);
  doc.text(`CNPJ: ${d.empresa.cnpj || "—"}`, 15, 58);
  doc.text(`Data: ${d.data}`, 15, 64);
  doc.setFont("helvetica", "bold").text("Marca:", 15, 71);
  doc.setFont("helvetica", "normal").text(d.marcas.join(", ") || "—", 29, 71);

  doc.setTextColor(110, 115, 125).setFontSize(9).text(d.rotuloNumero, W - 15, 47, { align: "right" });
  doc.setTextColor(20, 30, 50).setFont("helvetica", "bold").setFontSize(14).text(d.numero, W - 15, 54, { align: "right" });

  doc.setDrawColor(...azul).setLineWidth(0.6).line(15, 76, W - 15, 76);

  autoTable(doc, {
    startY: 82,
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
