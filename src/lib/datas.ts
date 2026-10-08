// Datas de calendário (sem hora) no fuso de São Paulo, no formato "AAAA-MM-DD".
export const FUSO = "America/Sao_Paulo";

const pad = (n: number) => String(n).padStart(2, "0");

/** Data (AAAA-MM-DD) de um instante, vista em São Paulo. */
export function ymdEmSP(instante: Date | string = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instante));
  return partes; // en-CA já sai como AAAA-MM-DD
}

export const hojeSP = () => ymdEmSP(new Date());

export function ymdValido(y: number, m: number, d: number) {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) || y < 1900 || y > 2999 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
export function ymdParaBr(ymd: string | null | undefined) {
  if (!ymd) return "";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

/** Lê "DD/MM", "DD/MM/AA" ou "DD/MM/AAAA" (também com - ou .). Sem ano, usa o ano atual. Retorna null se inválida. */
export function brParaYmd(texto: string, hoje = hojeSP()): string | null {
  const t = texto.trim();
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?$/) ?? t.match(/^(\d{2})(\d{2})(\d{4}|\d{2})?$/);
  if (!m) return null;
  const d = Number(m[1]); const mes = Number(m[2]);
  let y = m[3] ? Number(m[3]) : Number(hoje.slice(0, 4));
  if (m[3]?.length === 2) y += 2000;
  if (!ymdValido(y, mes, d)) return null;
  return `${y}-${pad(mes)}-${pad(d)}`;
}

/** Data de calendário → instante à meia-noite de São Paulo (para colunas com hora). */
export function ymdParaInstanteSP(ymd: string) {
  return `${ymd}T00:00:00-03:00`;
}
