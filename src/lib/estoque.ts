import type { Empresa, Produto } from "./empresas";

export type NivelEstoque = "normal" | "atencao" | "critico";

export type AlertaEstoque = Produto & {
  empresa: string;
  empresaSlug: string;
  empresaAccent: string;
  marca: string;
  marcaSlug: string;
  nivel: Exclude<NivelEstoque, "normal">;
};

export function nivelEstoque(produto: Pick<Produto, "estoque" | "estoque_minimo">): NivelEstoque {
  if (produto.estoque_minimo <= 0) return "normal";
  if (produto.estoque <= produto.estoque_minimo) return "critico";
  if (produto.estoque <= produto.estoque_minimo * 1.2) return "atencao";
  return "normal";
}

export function listarAlertas(empresas: Empresa[]): AlertaEstoque[] {
  return empresas
    .flatMap((empresa) =>
      empresa.marcas.flatMap((marca) =>
        marca.produtos.flatMap((produto) => {
          const nivel = nivelEstoque(produto);
          if (nivel === "normal") return [];
          return [{
            ...produto,
            empresa: empresa.nome,
            empresaSlug: empresa.slug,
            empresaAccent: empresa.accent,
            marca: marca.nome,
            marcaSlug: marca.slug,
            nivel,
          }];
        }),
      ),
    )
    .sort((a, b) => {
      if (a.nivel !== b.nivel) return a.nivel === "critico" ? -1 : 1;
      return a.estoque / a.estoque_minimo - b.estoque / b.estoque_minimo;
    });
}