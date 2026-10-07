import { describe, expect, it } from "vitest";
import { avaliarPrazoFull } from "../full-prazos";

const agora = new Date("2026-10-07T12:00:00.000Z");

describe("alertas de prazo do Full", () => {
  it("fica vermelho exatamente a partir de 72 horas antes", () => {
    expect(avaliarPrazoFull("2026-10-10T12:00:00.000Z", agora)).toEqual({ prazo: "critico", rotulo: "Faltam 3 dias" });
  });

  it("permanece normal quando faltam mais de 72 horas", () => {
    expect(avaliarPrazoFull("2026-10-10T12:00:01.000Z", agora).prazo).toBe("normal");
  });

  it("identifica Full atrasado", () => {
    expect(avaliarPrazoFull("2026-10-06T12:00:00.000Z", agora)).toEqual({ prazo: "atrasado", rotulo: "Atrasado há 1 dia" });
  });
});