export type Empresa = {
  slug: string;
  nome: string;
  descricao: string;
  accent: string; // cor de destaque (hex, usada em gráficos e detalhes)
  kpis: {
    faturamentoMes: number;
    variacaoMensal: number; // % vs mês anterior
    clientesAtivos: number;
    ticketMedio: number;
    metaAnualProgress: number; // 0 a 1
  };
  serieMensal: { mes: string; faturamento: number }[];
};

// Dados de EXEMPLO — serão substituídos pelos números reais de cada empresa.
export const EMPRESAS: Empresa[] = [
  {
    slug: "vivalle",
    nome: "Vivalle",
    descricao: "Unidade de negócio do grupo",
    accent: "#34d399",
    kpis: {
      faturamentoMes: 412_500,
      variacaoMensal: 8.4,
      clientesAtivos: 1_284,
      ticketMedio: 321,
      metaAnualProgress: 0.72,
    },
    serieMensal: [
      { mes: "Out", faturamento: 305_000 },
      { mes: "Nov", faturamento: 328_400 },
      { mes: "Dez", faturamento: 371_900 },
      { mes: "Jan", faturamento: 342_300 },
      { mes: "Fev", faturamento: 358_100 },
      { mes: "Mar", faturamento: 389_700 },
      { mes: "Abr", faturamento: 376_200 },
      { mes: "Mai", faturamento: 401_800 },
      { mes: "Jun", faturamento: 394_500 },
      { mes: "Jul", faturamento: 418_900 },
      { mes: "Ago", faturamento: 380_400 },
      { mes: "Set", faturamento: 412_500 },
    ],
  },
  {
    slug: "luminartech",
    nome: "Luminartech",
    descricao: "Unidade de negócio do grupo",
    accent: "#38bdf8",
    kpis: {
      faturamentoMes: 587_200,
      variacaoMensal: -2.1,
      clientesAtivos: 96,
      ticketMedio: 6_110,
      metaAnualProgress: 0.64,
    },
    serieMensal: [
      { mes: "Out", faturamento: 498_000 },
      { mes: "Nov", faturamento: 512_700 },
      { mes: "Dez", faturamento: 604_300 },
      { mes: "Jan", faturamento: 471_600 },
      { mes: "Fev", faturamento: 509_800 },
      { mes: "Mar", faturamento: 556_400 },
      { mes: "Abr", faturamento: 590_100 },
      { mes: "Mai", faturamento: 573_900 },
      { mes: "Jun", faturamento: 612_500 },
      { mes: "Jul", faturamento: 598_200 },
      { mes: "Ago", faturamento: 599_800 },
      { mes: "Set", faturamento: 587_200 },
    ],
  },
  {
    slug: "vitrine",
    nome: "Vitrine",
    descricao: "Unidade de negócio do grupo",
    accent: "#fbbf24",
    kpis: {
      faturamentoMes: 233_800,
      variacaoMensal: 12.7,
      clientesAtivos: 2_041,
      ticketMedio: 114,
      metaAnualProgress: 0.81,
    },
    serieMensal: [
      { mes: "Out", faturamento: 168_400 },
      { mes: "Nov", faturamento: 187_200 },
      { mes: "Dez", faturamento: 245_600 },
      { mes: "Jan", faturamento: 152_900 },
      { mes: "Fev", faturamento: 161_300 },
      { mes: "Mar", faturamento: 178_700 },
      { mes: "Abr", faturamento: 194_200 },
      { mes: "Mai", faturamento: 189_600 },
      { mes: "Jun", faturamento: 203_100 },
      { mes: "Jul", faturamento: 210_800 },
      { mes: "Ago", faturamento: 207_400 },
      { mes: "Set", faturamento: 233_800 },
    ],
  },
];

export function getEmpresa(slug: string): Empresa | undefined {
  return EMPRESAS.find((e) => e.slug === slug);
}

export const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

export const fmtBRLCurto = (v: number) =>
  v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
    : v >= 1_000
      ? `R$ ${(v / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`
      : fmtBRL(v);
