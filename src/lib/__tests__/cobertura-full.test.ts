import { describe, expect, it } from "vitest";
import { calcularCobertura } from "../cobertura-full";

describe("cobertura Full (100 vendas em 30 dias)", () => {
  it("200 un. = 60 dias, barra cheia, sem urgência", () => {
    const c = calcularCobertura(200, 100);
    expect(c.dias).toBeCloseTo(60); expect(c.preenchimento).toBe(100); expect(c.selo).toBe("SEM URGÊNCIA");
  });
  it("100 un. = 30 dias, 50%, atenção", () => {
    const c = calcularCobertura(100, 100);
    expect(c.preenchimento).toBeCloseTo(50); expect(c.selo).toBe("ATENÇÃO");
  });
  it("75 un. = 22,5 dias, repor em breve", () => expect(calcularCobertura(75, 100).selo).toBe("REPOR EM BREVE"));
  it("até 14 dias é urgente e vermelho", () => {
    const c = calcularCobertura(40, 100);
    expect(c.selo).toBe("URGENTE"); expect(c.matiz).toBe(0); expect(c.texto).toBe("Estoque para 12 dias");
  });
  it("sem estoque é urgente", () => expect(calcularCobertura(0, 100).texto).toBe("Sem estoque"));
  it("sem vendas não estima cobertura", () => expect(calcularCobertura(50, 0).dias).toBeNull());
  it("sem dados = indisponível", () => expect(calcularCobertura(null, 10).texto).toBe("Dados indisponíveis"));
});
