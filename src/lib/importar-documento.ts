import { supabase } from "@/integrations/supabase/client";
import { lerDocumentoPdf, type LinhaPdf } from "./pdf-import";
import type { CabecalhoMl } from "./pdf-ml";
import { assinaturaLinhas, casarEntreEmpresas, casarLinhas, type Pendente } from "./casar-produtos";
import type { EmpresaAtual } from "./empresa-atual";
import { hojeSP } from "./datas";
import { interpretarPdfSistema } from "./lista-compras";
import { lerTextoLinhas } from "./pdf-import";

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

export async function carregarProdutosEmpresa(empresaId: string | null) {
  let q = supabase.from("produtos").select("id, nome, codigo, cod, estoque, marca_id, marcas!inner(nome, empresa_id)");
  if (empresaId) q = q.eq("marcas.empresa_id", empresaId);
  const { data, error } = await q.order("ordem");
  if (error) throw error;
  return (data ?? []).map((p) => {
    const m = Array.isArray(p.marcas) ? p.marcas[0] : p.marcas;
    return { id: p.id, nome: p.nome, codigo: p.codigo, cod: p.cod, estoque: p.estoque, marca_id: p.marca_id, marca: m?.nome ?? "", empresa_id: m?.empresa_id ?? "" };
  });
}

/** Lê o PDF e cria um pedido/Full planejado da empresa atual. Retorna o id criado, ou null se o usuário cancelar. Não mexe no estoque. */
export async function criarDocumentoPorPdf(tipo: TipoDoc, arquivo: File, empresa: EmpresaAtual): Promise<string | null> {
  const t = T[tipo];
  let linhas: LinhaPdf[];
  let ml: CabecalhoMl | null = null;
  if (tipo === "pedido") {
    let sistema: ReturnType<typeof interpretarPdfSistema> = null;
    try { sistema = interpretarPdfSistema(await lerTextoLinhas(arquivo)); } catch { /* segue a leitura comum */ }
    if (sistema) return importarPdfSistema(sistema, empresa);
  }
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

  // Pedidos de compra: busca na empresa atual e depois nas outras (a entrada vai para a empresa dona do produto). Full: só a empresa atual.
  const produtos = await carregarProdutosEmpresa(tipo === "pedido" ? null : empresa.id);
  const locais = produtos.filter((p) => p.empresa_id === empresa.id);
  const { casados, pendentes } = tipo === "pedido" ? casarEntreEmpresas(linhas, locais, produtos.filter((p) => p.empresa_id !== empresa.id)) : casarLinhas(linhas, locais);
  const marcas = Array.from(new Set(casados.map((c) => produtos.find((p) => p.id === c.produtoId)).filter((p) => p?.empresa_id === empresa.id).map((p) => p!.marca)));
  const nome = ml?.frete ? `Frete #${ml.frete}` : marcas.length ? marcas.join(" + ") : arquivo.name.replace(/\.pdf$/i, "").slice(0, 120) || "Importado de PDF";

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sua sessão expirou. Entre novamente.");
  const registro: Record<string, unknown> = { nome, empresa_id: empresa.id, created_by: userData.user.id };
  if (tipo === "pedido") {
    const { data: emp } = await supabase.from("empresas").select("endereco").eq("id", empresa.id).maybeSingle();
    Object.assign(registro, { fornecedor: empresa.nome, data_pedido: hojeSP(), endereco_entrega: emp?.endereco ?? "" });
  }
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

type PdfSistema = NonNullable<ReturnType<typeof interpretarPdfSistema>>;
const cod4 = (n: number) => `#${String(n).padStart(4, "0")}`;

/** PDFs emitidos pelo próprio sistema: lista de compras (um pedido por marca) ou pedido individual. Revisão antes de gravar; não mexe no estoque. */
async function importarPdfSistema(pdf: PdfSistema, empresa: EmpresaAtual): Promise<string | null> {
  if (pdf.pedidoId) {
    const { data } = await db.from("pedidos").select("id, numero").eq("id", pdf.pedidoId).maybeSingle();
    if (data) return confirm(`Este PDF corresponde ao Pedido ${cod4(data.numero)}, que já existe. Abrir o registro?`) ? (data.id as string) : null;
  }
  if (pdf.lista) {
    const { data } = await db.from("pedidos").select("id, numero").eq("lista_ref", pdf.lista).neq("status", "cancelado").order("numero");
    if (data?.length) return confirm(`A lista ${pdf.lista} já gerou ${data.length} pedido(s) (${data.map((d: { numero: number }) => cod4(d.numero)).join(", ")}). Abrir o primeiro?`) ? (data[0].id as string) : null;
  }
  if (!pdf.itens.length) throw new Error("Nenhum produto foi encontrado nesse PDF. Nada foi criado.");
  const produtos = await carregarProdutosEmpresa(null);
  const locais = produtos.filter((p) => p.empresa_id === empresa.id);
  const outros = produtos.filter((p) => p.empresa_id !== empresa.id);
  // Identificadores exatos: SKU na lista, COD no pedido; empresa selecionada primeiro, depois as demais.
  const linhas: LinhaPdf[] = pdf.itens.map((i) => ({ cod: i.cod, nome: i.nome, quantidade: i.quantidade, ...(pdf.tipo === "lista" ? { sku: i.sku } : {}) }));
  const grupos = new Map<string, { casados: { produtoId: string; quantidade: number }[]; pendentes: Pendente[] }>();
  pdf.itens.forEach((item, k) => {
    const r = casarEntreEmpresas([linhas[k]!], locais, outros);
    const chave = pdf.tipo === "lista" ? (item.marca || "Sem marca") : (item.marca || "Pedido importado");
    const g = grupos.get(chave) ?? { casados: [], pendentes: [] };
    g.casados.push(...r.casados); g.pendentes.push(...r.pendentes);
    grupos.set(chave, g);
  });
  const resumo = Array.from(grupos.entries()).map(([m, g]) => `• ${m}: ${g.casados.length} reconhecido(s), ${g.pendentes.length} para revisar`).join("\n");
  const titulo = pdf.tipo === "lista" ? `Lista ${pdf.lista}: criar ${grupos.size} pedido(s) em rascunho, um por marca?` : "Criar um pedido em rascunho com este PDF?";
  if (!confirm(`${titulo}\n\n${resumo}\n\nO estoque não será alterado.`)) return null;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sua sessão expirou. Entre novamente.");
  const { data: emp } = await supabase.from("empresas").select("endereco").eq("id", empresa.id).maybeSingle();
  let primeiro: string | null = null;
  for (const [marca, g] of grupos) {
    const { data: doc, error } = await db.from("pedidos").insert({
      nome: marca.slice(0, 120), fornecedor: empresa.nome, empresa_id: empresa.id, created_by: userData.user.id, data_pedido: hojeSP(),
      endereco_entrega: emp?.endereco ?? "", ...(pdf.tipo === "lista" ? { origem: "lista_compras", rascunho: true, lista_ref: pdf.lista } : {}),
    }).select("id").single();
    if (error || !doc) throw new Error("Não foi possível criar o pedido.");
    const somados = new Map<string, number>();
    g.casados.forEach((c) => somados.set(c.produtoId, (somados.get(c.produtoId) ?? 0) + c.quantidade));
    if (somados.size) {
      const { error: e2 } = await db.from("pedido_itens").insert(Array.from(somados, ([produto_id, quantidade]) => ({ pedido_id: doc.id, produto_id, quantidade })));
      if (e2) { await db.from("pedidos").delete().eq("id", doc.id); throw new Error(`Não foi possível adicionar os produtos: ${e2.message}`); }
    }
    salvarPendentes("pedido", doc.id, g.pendentes);
    primeiro ??= doc.id as string;
  }
  return primeiro;
}
