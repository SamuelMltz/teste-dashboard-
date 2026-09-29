export type Produto = { nome: string; estoque: number };
export type Marca = { slug: string; nome: string; produtos: Produto[] };
export type Empresa = {
  slug: string;
  nome: string;
  accent: string; // cor de destaque (hex)
  marcas: Marca[];
};

// Preencher `marcas` de cada empresa com as marcas, produtos e estoque reais.
export const EMPRESAS: Empresa[] = [
  { slug: "vivalle", nome: "Vivalle", accent: "#34d399", marcas: [] },
  { slug: "luminartech", nome: "Luminartech", accent: "#38bdf8", marcas: [] },
  { slug: "vitrine", nome: "Vitrine", accent: "#fbbf24", marcas: [] },
];

export function getEmpresa(slug: string): Empresa | undefined {
  return EMPRESAS.find((e) => e.slug === slug);
}

export function getMarca(empresa: Empresa, slug: string): Marca | undefined {
  return empresa.marcas.find((m) => m.slug === slug);
}
