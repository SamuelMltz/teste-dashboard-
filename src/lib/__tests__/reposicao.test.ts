import { describe, expect, it } from "vitest";
import { classificarReposicao, sugerirReposicao } from "../reposicao";

describe("reposição do Full", () => {
  it("Full abaixo das vendas de 30 dias é 'abaixo'", () => expect(classificarReposicao(30, 100)).toBe("abaixo"));
  it("Full entre 100% e 120% das vendas é 'proximo'", () => {
    expect(classificarReposicao(100, 100)).toBe("proximo");
    expect(classificarReposicao(120, 100)).toBe("proximo");
    expect(classificarReposicao(121, 100)).toBe("ok");
  });
  it("sem vendas no período é 'sem referência'", () => expect(classificarReposicao(10, 0)).toBe("sem-referencia"));
  it("Full ausente não vira zero", () => expect(classificarReposicao(null, 50)).toBe("sem-dados"));
  it("sugestão indisponível sem dados", () => expect(sugerirReposicao(null, 50, 100)).toBeNull());
  it("envia do físico e compra o restante", () => expect(sugerirReposicao(20, 15, 60)).toEqual({ enviar: 15, comprar: 25 }));
});
