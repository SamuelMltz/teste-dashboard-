import { describe, expect, it } from "vitest";
import { casarLinhas } from "../casar-produtos";

const produtos = [
  { id: "a", cod: "100", codigo: "SKU-A" },
  { id: "b", cod: "200", codigo: "SKU-B" },
  { id: "c", cod: "200", codigo: "SKU-C" },
];

describe("casarLinhas", () => {
  it("casa pelo COD exato", () => {
    expect(casarLinhas([{ cod: "100", nome: "x", quantidade: 3 }], produtos).casados).toEqual([{ produtoId: "a", quantidade: 3 }]);
  });
  it("casa pelo SKU quando o COD não existe", () => {
    expect(casarLinhas([{ cod: "sku-b", nome: "x", quantidade: 2 }], produtos).casados).toEqual([{ produtoId: "b", quantidade: 2 }]);
  });
  it("COD repetido em dois produtos pede escolha", () => {
    const r = casarLinhas([{ cod: "200", nome: "x", quantidade: 1 }], produtos);
    expect(r.casados).toEqual([]);
    expect(r.pendentes[0]?.opcoes).toEqual(["b", "c"]);
  });
  it("não descarta códigos desconhecidos", () => {
    const r = casarLinhas([{ cod: "999", nome: "x", quantidade: 1 }], produtos);
    expect(r.pendentes).toHaveLength(1);
    expect(r.pendentes[0]?.opcoes).toEqual([]);
  });
});
