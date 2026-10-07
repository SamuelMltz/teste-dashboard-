export type PrazoFull = "normal" | "critico" | "atrasado";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

export function avaliarPrazoFull(dataPrevista: string, agora = new Date()): { prazo: PrazoFull; rotulo: string } {
  const diferenca = new Date(dataPrevista).getTime() - agora.getTime();
  if (diferenca < 0) {
    const dias = Math.max(1, Math.ceil(Math.abs(diferenca) / DIA));
    return { prazo: "atrasado", rotulo: dias === 1 ? "Atrasado há 1 dia" : `Atrasado há ${dias} dias` };
  }
  if (diferenca <= 72 * HORA) {
    const horas = Math.max(1, Math.ceil(diferenca / HORA));
    if (horas <= 24) return { prazo: "critico", rotulo: horas === 1 ? "Falta 1 hora" : `Faltam ${horas} horas` };
    const dias = Math.ceil(horas / 24);
    return { prazo: "critico", rotulo: `Faltam ${dias} dias` };
  }
  const dias = Math.ceil(diferenca / DIA);
  return { prazo: "normal", rotulo: `Faltam ${dias} dias` };
}

export function paraInputData(data: string | null | undefined) {
  if (!data) return "";
  const d = new Date(data);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}