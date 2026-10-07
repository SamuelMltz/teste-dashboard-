import { supabase } from "@/integrations/supabase/client";
import { lerDocumentoPdf, type LinhaPdf } from "./pdf-import";
import type { CabecalhoMl } from "./pdf-ml";
import { assinaturaLinhas, casarLinhas, type Pendente } from "./casar-produtos";
import type { EmpresaAtual } from "./empresa-atual";

export type TipoDoc = "full" | "pedido";

const T = {
  full: { tabela: "full_cargas", itens: "full_itens", fk: "carga_id", planejado: "planejada" },
  pedido: { tabela: "pedidos", itens: "pedido_itens", fk: "pedido_id", planejado: "planejado" },
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const chavePendentes = (tipo: TipoDoc, id: string) => `pendentes:${tipo}:${id}`;
export function lerPendentes(tipo: TipoDoc, id: string): Pendente[] {
  try { return JSON.parse(localStorage.getItem(chavePendentes(tipo, id)) ?? "[]"); } catch { return []; }
}
export function salvarPendentes(tipo: TipoDoc, id: string, lista: Pendente[]) {
  if (lista.length) localStorage.setItem(chavePendentes(tipo, id), JSON.stringify(lista));
  else localStorage.removeItem(chavePendentes(tipo, id));
}

const chaveImportacoes = "importacoes-pdf";
function lerImportacoes(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(chaveImportacoes) ?? "{}"); } catch { return {}; }
}

export async function carregarProdutosEmpresa(empresaId: string) {
  const { data, error } = await supabase.from("produtos").select("id, nome, codigo, cod, estoque, marca_id, marcas!inner(nome, empresa_id)").eq("marcas.empresa_id", empresaId).order("ordem");
  if (error) throw error;
  return (data ?? []).map((p) => {
    const m = Array.isArray(p.marcas) ? p.marcas[0] : p.marcas;
    return { id: p.id, nome: p.nome, codigo: p.codigo, cod: p.cod, estoque: p.estoque, marca_id: p.marca_id, marca: m?.nome ?? "", empresa_id: empresaId };
  });
}

/** Lê o PDF e cria um pedido/Full planejado da empresa atual. Retorna o id criado, ou null se o usuário cancelar. Não mexe no estoque. */
export async function criarDocumentoPorPdf(tipo: TipoDoc, arquivo: File, empresa: EmpresaAtual): Promise<string | null> {
  const t = T[tipo];
  let linhas: LinhaPdf[];
  let ml: CabecalhoMl | null = null;
  try { ({ linhas, ml } = await lerDocumentoPdf(arquivo)); } catch { throw new Error("Não foi possível ler esse PDF. Verifique se ele não é uma imagem escaneada ou protegido por senha."); }
  if (!linhas.length) throw new Error("Nenhum produto com código e quantidade foi encontrado nesse PDF. Nada foi criado.");

  if (ml && tipo !== "full") throw new Error("Este PDF é uma lista de envio Full do Mercado Livre. Importe-o na tela Full.");
  if (ml?.frete) {
    const { data: existente } = await db.from("full_cargas").select("id, numero").eq("empresa_id", empresa.id).eq("frete_ml", ml.frete).maybeSingle();
    if (existente) {
      if (confirm(`O Frete #${ml.frete} já foi importado nesta empresa (Full #${String(existente.numero).padStart(4, "0")}). Abrir o registro existente?`)) return existente.id as string;
      return null;
    }
  }

  const assinatura = `${tipo}:${empresa.id}:${assinaturaLinhas(linhas)}`;
  const anterior = lerImportacoes()[assinatura];
  if (anterior && !ml) {
    const { data } = await db.from(t.tabela).select("id, numero").eq("id", anterior).maybeSingle();
    if (data && !confirm(`Este PDF já foi importado (#${String(data.numero).padStart(4, "0")}). Criar outra cópia mesmo assim?`)) return null;
  }

  const produtos = await carregarProdutosEmpresa(empresa.id);
  const { casados, pendentes } = casarLinhas(linhas, produtos);
  const marcas = Array.from(new Set(casados.map((c) => produtos.find((p) => p.id === c.produtoId)?.marca).filter(Boolean)));
  const nome = ml?.frete ? `Frete #${ml.frete}` : marcas.length ? marcas.join(" + ") : arquivo.name.replace(/\.pdf$/i, "").slice(0, 120) || "Importado de PDF";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sua sessão expirou. Entre novamente.");
  const registro: Record<string, unknown> = { nome, empresa_id: empresa.id, created_by: userData.user.id };
  if (tipo === "pedido") registro["fornecedor"] = empresa.nome;
  if (ml) Object.assign(registro, { frete_ml: ml.frete || null, ml_total_produtos: ml.totalProdutos, ml_total_unidades: ml.totalUnidades });
  const { data: doc, error } = await db.from(t.tabela).insert(registro).select("id").single();
  if (error || !doc) throw new Error(error?.code === "23505" ? "Esse frete já foi importado nesta empresa." : "Não foi possível criar o registro.");

  if (casados.length) {
    const { error: e2 } = await db.from(t.itens).insert(casados.map((c) => ({ [t.fk]: doc.id, produto_id: c.produtoId, quantidade: c.quantidade })));
    if (e2) {
      await db.from(t.tabela).delete().eq("id", doc.id);
      throw new Error(`Não foi possível adicionar os produtos: ${e2.message}`);
    }
  }
  salvarPendentes(tipo, doc.id, pendentes);
  localStorage.setItem(chaveImportacoes, JSON.stringify({ ...lerImportacoes(), [assinatura]: doc.id }));
  return doc.id as string;
}
