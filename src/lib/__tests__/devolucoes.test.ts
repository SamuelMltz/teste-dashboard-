import { describe, expect, it } from "vitest";
import { podeLancarEstoque, statusPermitidos } from "../devolucoes";

describe("devoluções", () => {
  it("lança no estoque só apto + aprovada", () => {
    expect(podeLancarEstoque({ condicao: "apto", status: "aprovada", estoque_lancado_at: null })).toBe(true);
    expect(podeLancarEstoque({ condicao: "avariado", status: "aprovada", estoque_lancado_at: null })).toBe(false);
    expect(podeLancarEstoque({ condicao: "em_analise", status: "aprovada", estoque_lancado_at: null })).toBe(false);
    expect(podeLancarEstoque({ condicao: "apto", status: "em_analise", estoque_lancado_at: null })).toBe(false);
  });
  it("não lança duas vezes", () => {
    expect(podeLancarEstoque({ condicao: "apto", status: "aprovada", estoque_lancado_at: "2026-10-13" })).toBe(false);
  });
  it("avariado não pode ser aprovado para estoque", () => {
    expect(statusPermitidos({ condicao: "avariado", status: "pendente", estoque_lancado_at: null })).not.toContain("aprovada");
    expect(statusPermitidos({ condicao: "apto", status: "pendente", estoque_lancado_at: null })).not.toContain("finalizada");
  });
});
