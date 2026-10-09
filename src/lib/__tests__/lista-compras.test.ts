import { describe, expect, it } from "vitest";
import { calcularReposicao, interpretarPdfSistema, saldoPendente } from "../lista-compras";

describe("lista de compras", () => {
  it("exemplo: mínimo 10, alvo 13, físico 8, 3 em pedido → comprar 2", () => {
    const r = calcularReposicao(8, 10, 3);
    expect(r.alvo).toBe(13);
    expect(r.sugestao).toBe(2);
    expect(r.cobertura).toBe("parcial");
  });
  it("sem pedidos: compra até o alvo", () => expect(calcularReposicao(8, 10, 0)).toMatchObject({ sugestao: 5, cobertura: "a-comprar", situacao: "abaixo" }));
  it("pedidos cobrindo tudo não sugerem compra", () => expect(calcularReposicao(8, 10, 5)).toMatchObject({ sugestao: 0, cobertura: "coberto" }));
  it("entre o mínimo e 120% é 'próximo'", () => {
    expect(calcularReposicao(10, 10, 0).situacao).toBe("proximo");
    expect(calcularReposicao(12, 10, 0).situacao).toBe("proximo");
    expect(calcularReposicao(13, 10, 0)).toMatchObject({ situacao: "ok", sugestao: 0 });
  });
  it("alvo arredonda para cima", () => expect(calcularReposicao(0, 7, 0).alvo).toBe(10));
  it("mínimo zero fica sem sugestão", () => expect(calcularReposicao(0, 0, 0)).toMatchObject({ situacao: "sem-minimo", sugestao: 0 }));
  it("percentuais configuráveis", () => expect(calcularReposicao(10, 10, 0, { atencaoPct: 120, alvoPct: 200 }).sugestao).toBe(10));
  it("recebimento parcial conta só o saldo; recebidos e cancelados não contam", () => {
    expect(saldoPendente({ quantidade: 10, quantidade_recebida: 4 }, "planejado")).toBe(6);
    expect(saldoPendente({ quantidade: 10 }, "recebido")).toBe(0);
    expect(saldoPendente({ quantidade: 10 }, "cancelado")).toBe(0);
  });
  it("reconhece o PDF da lista por marca", () => {
    const r = interpretarPdfSistema(["LISTA DE COMPRAS", "LC-LUMI-20261009-1530", "Marca: Gaya", "SKU COD PRODUTO QUANTIDADE", "G024 F-1 Fita LED 12V 5 metros 7", "Marca: Outra", "X1 — Fonte 2"]);
    expect(r?.tipo).toBe("lista");
    expect(r?.itens).toEqual([
      { sku: "G024", cod: "F-1", nome: "Fita LED 12V 5 metros", quantidade: 7, marca: "Gaya" },
      { sku: "X1", cod: "", nome: "Fonte", quantidade: 2, marca: "Outra" },
    ]);
  });
  it("reconhece o pedido individual pela referência", () => {
    const r = interpretarPdfSistema(["Ref. PED-0b0e1c2d-1111-2222-3333-444455556666", "COD PRODUTO QUANTIDADE", "F-1 Fita LED 3"]);
    expect(r).toMatchObject({ tipo: "pedido", pedidoId: "0b0e1c2d-1111-2222-3333-444455556666" });
    expect(r?.itens[0]).toMatchObject({ cod: "F-1", quantidade: 3 });
  });
});
