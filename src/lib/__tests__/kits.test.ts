import { describe, expect, it } from "vitest";
import { expandirKits } from "../kits";
import { montarRelatorio } from "../relatorio-estoque";

const kit = { sku: "KIT1", itens: [{ sku: "A", quantidade: 2 }, { sku: "B", quantidade: 1 }] };

describe("kits", () => {
  it("3 kits de 2×A + 1×B viram 6 A e 3 B", () => {
    expect(expandirKits([{ sku: "kit1", quantidade: 3 }], [kit])).toEqual([{ sku: "A", quantidade: 6 }, { sku: "B", quantidade: 3 }]);
  });
  it("relatório soma o Full do kit no estoque dos produtos", () => {
    const r = montarRelatorio([{ codigo: "A", nome: "A", estoque: 10, preco_custo: 1 }, { codigo: "B", nome: "B", estoque: 0, preco_custo: null }], [{ sku: "KIT1", quantidade: 4 }, { sku: "A", quantidade: 1 }], [kit]);
    expect(r.linhas.map((l) => l.total)).toEqual([19, 4]);
  });
});
