import { describe, expect, it } from "vitest";
import { brParaYmd, ymdEmSP, ymdParaBr } from "../datas";

describe("datas", () => {
  it("completa o ano atual quando só dia e mês são digitados", () => {
    expect(brParaYmd("15/03", "2031-01-10")).toBe("2031-03-15");
  });
  it("aceita data completa e ano com 2 dígitos", () => {
    expect(brParaYmd("01/12/2027")).toBe("2027-12-01");
    expect(brParaYmd("1/2/27")).toBe("2027-02-01");
  });
  it("rejeita datas inválidas", () => {
    expect(brParaYmd("31/02/2026")).toBeNull();
    expect(brParaYmd("12/13")).toBeNull();
    expect(brParaYmd("abc")).toBeNull();
  });
  it("exibe em DD/MM/AAAA", () => {
    expect(ymdParaBr("2026-10-08")).toBe("08/10/2026");
  });
  it("usa o dia de São Paulo, não o UTC", () => {
    expect(ymdEmSP("2026-10-09T02:00:00Z")).toBe("2026-10-08");
  });
});
