import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { interpretarMl, ehListaMl, type ItemPdf } from "../pdf-ml";
import { casarLinhas } from "../casar-produtos";

async function itens(): Promise<ItemPdf[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(path.join(__dirname, "fixtures/ml-full.pdf")));
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: ItemPdf[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const c = await (await doc.getPage(p)).getTextContent();
    for (const i of c.items) if ("str" in i && i.str.trim()) out.push({ p, x: i.transform[4], y: i.transform[5], s: i.str });
  }
  return out;
}

describe("leitor de envio Full do Mercado Livre", () => {
  it("lê cabeçalho, 16 itens e 547 unidades", async () => {
    const it_ = await itens();
    expect(ehListaMl(it_)).toBe(true);
    const r = interpretarMl(it_);
    expect(r.cabecalho).toEqual({ frete: "78832845", totalProdutos: 16, totalUnidades: 547 });
    expect(r.linhas).toHaveLength(16);
    expect(r.linhas.reduce((s, l) => s + l.quantidade, 0)).toBe(547);
    const q = (sku: string) => r.linhas.find((l) => l.sku === sku);
    expect(q("G024")?.quantidade).toBe(53);
    expect(q("G007")?.quantidade).toBe(100);
    expect(q("G027")?.quantidade).toBe(54);
    expect(q("T002")?.quantidade).toBe(80);
    expect(q("G024")?.codigoMl).toBe("WPFO92647");
    expect(q("G024")?.codigoUniversal).toBe("7899097956467");
    expect(q("G024")?.nome).toBe("Fita Led 2835 Super Brilho 12v 12w 5 Metros Gaya Branco- quente 12v");
    expect(q("ATUS004")?.identificacao).toContain("Etiquetagem");
  });

  it("casa só por SKU exato, nunca pelo COD ou nome", () => {
    const linhas = [{ cod: "", sku: "G024", nome: "Fita 12v", quantidade: 5 }, { cod: "", sku: "G999", nome: "Fita 12v", quantidade: 2 }];
    const produtos = [{ id: "a", cod: "G999", codigo: "G024" }, { id: "b", cod: "", codigo: "G025" }];
    const r = casarLinhas(linhas, produtos);
    expect(r.casados).toEqual([{ produtoId: "a", quantidade: 5 }]);
    expect(r.pendentes.map((p) => p.sku)).toEqual(["G999"]);
  });
});
