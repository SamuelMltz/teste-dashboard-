import { describe, expect, it } from "vitest";
import { montarRelatorio } from "../relatorio-estoque";

describe("relatório de estoque", () => {
  it("100 físicas + 50 Full a R$ 10 = 150 un. e R$ 1.500", () => {
    const r = montarRelatorio([{ codigo: "A", nome: "A", estoque: 100, preco_custo: 10 }], [{ sku: "A", quantidade: 50 }]);
    expect(r.linhas[0]).toMatchObject({ total: 150, custo: 1500 });
    expect(r.parcial).toBe(false);
  });
  it("sem custo marca o total como parcial", () => {
    const r = montarRelatorio([{ codigo: "A", nome: "A", estoque: 5, preco_custo: null }, { codigo: "B", nome: "B", estoque: 2, preco_custo: 3 }], []);
    expect(r.linhas[0]!.custo).toBeNull();
    expect(r.custoTotal).toBe(6);
    expect(r.parcial).toBe(true);
  });
});
