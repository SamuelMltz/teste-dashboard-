import { useSyncExternalStore } from "react";

export type EmpresaAtual = { id: string; slug: string; nome: string };

const CHAVE = "empresa-atual";
const ouvintes = new Set<() => void>();
let cache: { bruto: string | null; valor: EmpresaAtual | null } = { bruto: null, valor: null };

function ler(): EmpresaAtual | null {
  if (typeof window === "undefined") return null;
  const bruto = window.localStorage.getItem(CHAVE);
  if (bruto === cache.bruto) return cache.valor;
  let valor: EmpresaAtual | null = null;
  try { const v = bruto ? JSON.parse(bruto) : null; if (v?.id && v?.slug && v?.nome) valor = v; } catch { valor = null; }
  cache = { bruto, valor };
  return valor;
}

export function definirEmpresaAtual(empresa: EmpresaAtual | null) {
  if (empresa) window.localStorage.setItem(CHAVE, JSON.stringify({ id: empresa.id, slug: empresa.slug, nome: empresa.nome }));
  else window.localStorage.removeItem(CHAVE);
  ouvintes.forEach((o) => o());
}

function assinar(o: () => void) {
  ouvintes.add(o);
  const aoMudar = (e: StorageEvent) => { if (e.key === CHAVE) o(); };
  window.addEventListener("storage", aoMudar);
  return () => { ouvintes.delete(o); window.removeEventListener("storage", aoMudar); };
}

export function useEmpresaAtual() {
  return useSyncExternalStore(assinar, ler, () => null);
}
