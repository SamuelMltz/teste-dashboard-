import { describe, expect, it } from "vitest";
import { margemPromocional, nivelMargem, precoPromocional, statusPromocao } from "../promocoes";

describe("promoções", () => {
  it("aplica o percentual de desconto ao preço de venda", () => {
    expect(precoPromocional(100, 20)).toBe(80);
  });
  it("margem usa o preço promocional e o custo", () => {
    expect(margemPromocional(100, 60, 20)).toBe(25); // (80-60)/80
  });
  it("sem custo ou venda não há margem", () => {
    expect(margemPromocional(null, 60, 20)).toBeNull();
    expect(margemPromocional(100, null, 20)).toBeNull();
  });
  it("classifica margem negativa e baixa", () => {
    expect(nivelMargem(-5)).toBe("negativa");
    expect(nivelMargem(10)).toBe("baixa");
    expect(nivelMargem(25)).toBe("boa");
  });
  it("status pelo período", () => {
    const p = { data_inicio: "2026-04-10", data_fim: "2026-04-20", encerrada: false };
    expect(statusPromocao(p, "2026-04-15")).toBe("ativa");
    expect(statusPromocao(p, "2026-04-21")).toBe("encerrada");
    expect(statusPromocao(p, "2026-04-01")).toBe("agendada");
    expect(statusPromocao({ ...p, encerrada: true }, "2026-04-15")).toBe("encerrada");
  });
});
