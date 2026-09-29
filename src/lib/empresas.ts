export type Produto = { nome: string; estoque: number };
export type Marca = { slug: string; nome: string; produtos: Produto[] };
export type Empresa = {
  slug: string;
  nome: string;
  accent: string; // cor de destaque (hex)
  marcas: Marca[];
};

export function getMarca(empresa: Empresa, slug: string): Marca | undefined {
  return empresa.marcas.find((m) => m.slug === slug);
}
