import { describe, expect, it } from "vitest";
import { prepararFatias } from "../graficos";

const LINHAS = [
  { marca: "a", marcaNome: "Marca A", fisico: 50, full: 30 },
  { marca: "a", marcaNome: "Marca A", fisico: 80, full: 40 },
  { marca: "b", marcaNome: "Marca B", fisico: 15, full: 20 },
];

describe("prepararFatias", () => {
  it("agrupa produtos por marca e calcula a participação no estoque Full", () => {
    const { fatias, total } = prepararFatias(LINHAS, "full");
    expect(total).toBe(90);
    expect(fatias).toEqual([{ nome: "Marca A", valor: 70, percentual: 77.8 }, { nome: "Marca B", valor: 20, percentual: 22.2 }]);
  });

  it("considera somente o estoque físico quando escolhido", () => {
    const { fatias, total } = prepararFatias(LINHAS, "fisico");
    expect(total).toBe(145);
    expect(fatias.map((f) => f.valor)).toEqual([130, 15]);
    expect(fatias.map((f) => f.percentual)).toEqual([89.7, 10.3]);
  });

  it("em Ambos soma físico e Full uma única vez por produto", () => {
    const { fatias, total } = prepararFatias(LINHAS, "ambos");
    expect(total).toBe(235);
    expect(fatias.map((f) => f.valor)).toEqual([200, 35]);
    expect(fatias.map((f) => f.percentual)).toEqual([85.1, 14.9]);
  });

  it("em Ambos utiliza os valores disponíveis sem inventar estoque Full", () => {
    expect(prepararFatias([{ marca: "A", fisico: 8, full: null }], "ambos").total).toBe(8);
  });

  it("devolve lista vazia quando nenhum item tem valor", () => {
    const { fatias, total } = prepararFatias(
      [
        { marca: "A", fisico: 12, full: null },
        { marca: "B", fisico: 10, full: 0 },
        { marca: "C", fisico: 10, full: NaN },
      ],
      "full",
    );
    expect(fatias).toEqual([]);
    expect(total).toBe(0);
  });
  it("mantém vazio quando não há produtos da empresa e filtros selecionados", () => {
    expect(prepararFatias([], "ambos")).toEqual({ fatias: [], total: 0 });
  });
});
