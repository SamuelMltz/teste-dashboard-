import { describe, expect, it } from "vitest";
import { dividirEstoque } from "../graficos";

describe("dividirEstoque", () => {
  it("soma Full e físico e calcula percentuais", () => {
    expect(dividirEstoque([{ full: 4000, fisico: 1000 }, { full: 3000, fisico: 2000 }])).toEqual({ full: 7000, fisico: 3000, total: 10000, pctFull: 70, pctFisico: 30 });
  });
  it("total zero dá 0% sem divisão por zero", () => {
    expect(dividirEstoque([{ full: null, fisico: 0 }])).toEqual({ full: 0, fisico: 0, total: 0, pctFull: 0, pctFisico: 0 });
  });
});
