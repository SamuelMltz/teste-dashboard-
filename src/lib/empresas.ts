export type Produto = { nome: string; codigo: string; estoque: number; ordem: number };
export type Marca = { slug: string; nome: string; ordem: number; produtos: Produto[] };
export type Empresa = {
  slug: string;
  nome: string;
  accent: string; // cor de destaque (hex)
  marcas: Marca[];
};

export function getMarca(empresa: Empresa, slug: string): Marca | undefined {
  return empresa.marcas.find((m) => m.slug === slug);
}
