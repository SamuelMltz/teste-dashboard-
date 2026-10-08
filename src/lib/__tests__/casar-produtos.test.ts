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

import { casarEntreEmpresas } from "../casar-produtos";

describe("casarEntreEmpresas (pedidos de compra)", () => {
  const luminar = [{ id: "l1", cod: "100", codigo: "L-1" }];
  const outras = [{ id: "v1", cod: "100", codigo: "V-1" }, { id: "v2", cod: "300", codigo: "V-2" }, { id: "t1", cod: "400", codigo: "T" }, { id: "v4", cod: "400", codigo: "V4" }];
  it("prefere a empresa selecionada", () => {
    expect(casarEntreEmpresas([{ cod: "100", nome: "x", quantidade: 1 }], luminar, outras).casados).toEqual([{ produtoId: "l1", quantidade: 1 }]);
  });
  it("vincula ao produto da outra empresa quando só existe lá", () => {
    expect(casarEntreEmpresas([{ cod: "300", nome: "x", quantidade: 5 }], luminar, outras).casados).toEqual([{ produtoId: "v2", quantidade: 5 }]);
  });
  it("várias correspondências em outras empresas pedem escolha", () => {
    const r = casarEntreEmpresas([{ cod: "400", nome: "x", quantidade: 2 }], luminar, outras);
    expect(r.casados).toEqual([]);
    expect(r.pendentes[0]?.opcoes).toEqual(["t1", "v4"]);
  });
});
