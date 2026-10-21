/** Cobertura do estoque Full por produto (60 dias = barra cheia). Funções puras. */
export type StatusCobertura = "sem_urgencia" | "atencao" | "repor_breve" | "urgente" | "sem_vendas" | "indisponivel";

export type Cobertura = {
  status: StatusCobertura;
  selo: string;
  texto: string;
  dias: number | null;
  mediaDiaria: number | null;
  preenchimento: number; // 0–100
  matiz: number | null; // HSL hue; null = neutro
};

const SELOS: Record<StatusCobertura, string> = {
  sem_urgencia: "SEM URGÊNCIA", atencao: "ATENÇÃO", repor_breve: "REPOR EM BREVE", urgente: "URGENTE",
  sem_vendas: "SEM VENDAS", indisponivel: "INDISPONÍVEL",
};

// Pontos de cor (dias → matiz): verde, amarelo-verde, amarelo-laranja, laranja, vermelho.
const PONTOS: [number, number][] = [[14, 0], [22.5, 28], [30, 42], [37.5, 70], [45, 130], [60, 140]];

export function matizCobertura(dias: number): number {
  if (dias <= 14) return 0;
  if (dias >= 60) return 140;
  for (let i = 1; i < PONTOS.length; i++) {
    const [d1, h1] = PONTOS[i - 1]!, [d2, h2] = PONTOS[i]!;
    if (dias <= d2) return h1 + ((dias - d1) / (d2 - d1)) * (h2 - h1);
  }
  return 140;
}

export function statusPorDias(dias: number): StatusCobertura {
  if (dias <= 14) return "urgente";
  if (dias < 30) return "repor_breve";
  if (dias < 45) return "atencao";
  return "sem_urgencia";
}

export function textoCobertura(dias: number): string {
  if (dias <= 14) { const d = Math.max(0, Math.floor(dias)); return `Estoque para ${d} ${d === 1 ? "dia" : "dias"}`; }
  if (dias < 56) { const s = Math.round(dias / 7); return `Estoque para cerca de ${s} semanas`; }
  const m = Math.round(dias / 30);
  return `Estoque para ${m === 1 ? "1 mês" : `${m} meses`}`;
}

/** full = estoque Full disponível; vendasFull30 = unidades vendidas pelo Full em 30 dias. null = sem dados. */
export function calcularCobertura(full: number | null, vendasFull30: number | null): Cobertura {
  const base = (status: StatusCobertura, texto: string, extra: Partial<Cobertura> = {}): Cobertura =>
    ({ status, selo: SELOS[status], texto, dias: null, mediaDiaria: null, preenchimento: 0, matiz: null, ...extra });
  if (full === null || vendasFull30 === null) return base("indisponivel", "Dados indisponíveis");
  const media = vendasFull30 / 30;
  if (full <= 0) return base("urgente", "Sem estoque", { dias: 0, mediaDiaria: media, matiz: 0 });
  if (vendasFull30 <= 0) return base("sem_vendas", "Sem vendas nos últimos 30 dias", { mediaDiaria: 0 });
  const dias = full / media;
  return base(statusPorDias(dias), textoCobertura(dias), {
    dias, mediaDiaria: media, preenchimento: Math.min(100, Math.max(0, (dias / 60) * 100)), matiz: matizCobertura(dias),
  });
}
