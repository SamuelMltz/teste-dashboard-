import { describe, expect, it } from "vitest";
import { prepararFatias } from "../graficos";

const LINHAS = [
  { sku: "G024", nome: "Fita LED 12V", full: 30 },
  { sku: "G007", nome: "Fonte 12V", full: 40 },
  { sku: "G027", nome: "Fita LED IP65", full: 20 },
];

describe("prepararFatias", () => {
  it("soma o total e calcula o percentual de cada fatia", () => {
    const { fatias, total } = prepararFatias(LINHAS, "full");
    expect(total).toBe(90);
    expect(fatias.map((f) => f.percentual)).toEqual([33, 44, 22]);
  });

  it("ignora itens sem valor e mantém a ordem recebida", () => {
    const { fatias, total } = prepararFatias(
      [
        { sku: "A", nome: "Um", full: null },
        { sku: "B", nome: "Dois", full: 10 },
        { sku: "C", nome: "Três", full: 0 },
        { sku: "D", nome: "Quatro", full: 30 },
      ],
      "full",
    );
    expect(fatias.map((f) => f.nome)).toEqual(["B", "D"]);
    expect(total).toBe(40);
  });

  it("usa o nome do produto quando o SKU está vazio", () => {
    const { fatias, total } = prepararFatias([{ sku: "", nome: "Sem SKU", full: 5 }], "full");
    expect(fatias.map((f) => f.nome)).toEqual(["Sem SKU"]);
    expect(total).toBe(5);
  });

  it("devolve lista vazia quando nenhum item tem valor", () => {
    const { fatias, total } = prepararFatias(
      [
        { sku: "A", nome: "Um", full: null },
        { sku: "B", nome: "Dois", full: 0 },
      ],
      "full",
    );
    expect(fatias).toEqual([]);
    expect(total).toBe(0);
  });
});
