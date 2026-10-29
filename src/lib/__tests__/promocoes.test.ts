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

import { lucroPromocional } from "../promocoes";
describe("lucroPromocional", () => {
  it("desconta imposto, custo fixo e Ads do preço promocional", () => {
    // venda 100, 20% off = 80; custo 40; 10%+5%+5% de 80 = 16 → lucro 24, margem 30%
    expect(lucroPromocional(100, 40, 20, { imposto_pct: 10, custo_fixo_pct: 5, ads_pct: 5 })).toEqual({ lucro: 24, margem: 30 });
  });
  it("percentuais vazios contam como zero", () => {
    expect(lucroPromocional(100, 60, 20, { imposto_pct: null, custo_fixo_pct: null, ads_pct: null })).toEqual({ lucro: 20, margem: 25 });
  });
  it("sem custo não calcula", () => {
    expect(lucroPromocional(100, null, 20, { imposto_pct: 10, custo_fixo_pct: 0, ads_pct: 0 })).toBeNull();
  });
});

import { lucroAnuncio, matizMargem } from "../promocoes";
describe("anúncios ML", () => {
  it("lucro no preço atual desconta custo e percentuais", () => {
    expect(lucroAnuncio(100, 50, { imposto_pct: 10, custo_fixo_pct: 5, ads_pct: 5 })).toEqual({ lucro: 30, margem: 30 });
  });
  it("sem custo fica incompleto", () => { expect(lucroAnuncio(100, null, { imposto_pct: 10, custo_fixo_pct: null, ads_pct: null })).toBeNull(); });
  it("gradiente vai de vermelho (0%) a verde (30%)", () => {
    expect(matizMargem(-5)).toBe(0); expect(matizMargem(15)).toBe(65); expect(matizMargem(40)).toBe(130);
  });
});
