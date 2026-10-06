import { describe, expect, it } from "vitest";
import { interpretarLinhas } from "../pdf-import";

describe("interpretarLinhas", () => {
  it("lê COD e quantidade com descrição quebrada em linhas", () => {
    const r = interpretarLinhas([
      "Imagem Codigo Descrição UN Quant. Preço",
      "FITA COB DETAIL 9W/M 2700K 12V 5MT 900 9,7",
      "1133 PC 300,00 33,60 982,8000 11.062,800",
      "LÚMENS/M IP20 5",
      "DRIVER SLIM 5A 12V - ATÉ 60W ENTRADA 3,7",
      "9366 PC 1.000,00 16,80 630,0000 17.430,000",
      "BIVOLT IP20 5",
    ]);
    expect(r.map((l) => [l.cod, l.quantidade])).toEqual([["1133", 300], ["9366", 1000]]);
    expect(r[0].nome).toBe("FITA COB DETAIL 9W/M 2700K 12V 5MT 900 LÚMENS/M IP20");
  });
  it("soma códigos repetidos", () => {
    const r = interpretarLinhas(["477 FITA ATUS PC 50,00", "477 FITA ATUS PC 25,00"]);
    expect(r).toEqual([{ cod: "477", nome: "FITA ATUS", quantidade: 75 }]);
  });
});
