import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, Download, PackagePlus, Plus, Trash2, Truck, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lerDocumentoPdf } from "@/lib/pdf-import";
import { casarEntreEmpresas, casarLinhas, type Pendente } from "@/lib/casar-produtos";
import { lerPendentes, salvarPendentes } from "@/lib/importar-documento";
import { AdicionarProdutoModal, NovoProdutoModal, somarItem } from "./ProdutoModais";
import { gerarPdf } from "@/lib/pdf-export";
import { CampoData } from "./CampoData";
import { hojeSP, ymdEmSP, ymdParaBr, ymdParaInstanteSP } from "@/lib/datas";

export type Tipo = "full" | "pedido";

type Produto = { id: string; nome: string; codigo: string; cod: string; estoque: number; marca_id: string; marca: string; empresa_id: string; empresa_nome: string };
type Item = { id: string; produto_id: string; quantidade: number; preparado?: boolean; produto: Produto };
type Doc = { id: string; numero: number; nome: string; status: string; frete_ml?: string | null; data_prevista?: string | null; data_pedido?: string; endereco_entrega?: string; ml_total_produtos?: number | null; ml_total_unidades?: number | null; created_at: string; empresa: { id: string; nome: string; endereco: string; cnpj: string }; itens: Item[] };
type Marca = { id: string; nome: string; empresa_id: string };

const CFG = {
  full: {
    tabela: "full_cargas", itens: "full_itens", fk: "carga_id", planejado: "planejada", rpc: "confirmar_carga_full", rpcArg: "_carga_id",
    voltar: "/full", voltarTexto: "Voltar para Full", titulo: "Detalhes do envio Full", sub: "Confira os produtos e prepare o envio para o Full.",
    rotuloNumero: "NÚMERO DO ENVIO", prefixo: "Envio", confirmar: "Confirmar envio", ajuda: "Importe o PDF para conferir os produtos do envio.",
    pdfTitulo: "ENVIO FULL", cor: "amber" as const,
  },
  pedido: {
    tabela: "pedidos", itens: "pedido_itens", fk: "pedido_id", planejado: "planejado", rpc: "confirmar_recebimento_pedido", rpcArg: "_pedido_id",
    voltar: "/pedidos", voltarTexto: "Voltar para pedidos", titulo: "Detalhes do pedido", sub: "Confira os itens e baixe o pedido em PDF.",
    rotuloNumero: "NÚMERO DO PEDIDO", prefixo: "Pedido", confirmar: "Confirmar recebimento", ajuda: "Importe o pedido para conferir os produtos recebidos.",
    pdfTitulo: "PEDIDO DE COMPRA", cor: "green" as const,
  },
};

// Tabelas variam entre Full e Pedidos; o cliente tipado não aceita nomes dinâmicos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const codigo = (n: number) => `#${String(n).padStart(4, "0")}`;

async function carregar(tipo: Tipo, id: string): Promise<{ doc: Doc; produtos: Produto[]; outros: Produto[]; marcas: Marca[] }> {
  const c = CFG[tipo];
  const [docRes, itensRes, produtosRes, marcasRes] = await Promise.all([
    db.from(c.tabela).select(tipo === "full" ? "id, numero, nome, status, created_at, frete_ml, data_prevista, ml_total_produtos, ml_total_unidades, empresas(id, nome, endereco, cnpj)" : "id, numero, nome, status, created_at, data_pedido, endereco_entrega, empresas(id, nome, endereco, cnpj)").eq("id", id).single(),
    db.from(c.itens).select(tipo === "full" ? "id, produto_id, quantidade, preparado" : "id, produto_id, quantidade").eq(c.fk, id).order("created_at"),
    supabase.from("produtos").select("id, nome, codigo, cod, estoque, marca_id, marcas!inner(nome, empresa_id, empresas(nome))").order("ordem"),
    supabase.from("marcas").select("id, nome, empresa_id").order("ordem"),
  ]);
  const erro = docRes.error ?? itensRes.error ?? produtosRes.error ?? marcasRes.error;
  if (erro) throw erro;
  const produtos: Produto[] = (produtosRes.data ?? []).map((p) => {
    const m = Array.isArray(p.marcas) ? p.marcas[0] : p.marcas;
    return { id: p.id, nome: p.nome, codigo: p.codigo, cod: p.cod, estoque: p.estoque, marca_id: p.marca_id, marca: m?.nome ?? "", empresa_id: m?.empresa_id ?? "", empresa_nome: (m?.empresas as { nome: string } | null)?.nome ?? "" };
  });
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const empresa = Array.isArray(docRes.data.empresas) ? docRes.data.empresas[0] : docRes.data.empresas;
  const itens: Item[] = (itensRes.data ?? []).flatMap((i: { id: string; produto_id: string; quantidade: number; preparado?: boolean }) => {
    const produto = porId.get(i.produto_id);
    return produto ? [{ ...i, produto }] : [];
  });
  return {
    doc: { ...docRes.data, empresa, itens },
    produtos: produtos.filter((p) => p.empresa_id === empresa.id),
    // Só pedidos de compra aceitam produtos de outras empresas.
    outros: tipo === "pedido" ? produtos.filter((p) => p.empresa_id !== empresa.id) : [],
    marcas: (marcasRes.data ?? []).filter((m) => m.empresa_id === empresa.id),
  };
}

function CampoProduto({ produtoId, campo, placeholder, onSalvo }: { produtoId: string; campo: "codigo" | "nome"; placeholder: string; onSalvo: () => unknown }) {
  const [valor, setValor] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function salvar() {
    const v = valor.trim();
    if (!v || salvando) return;
    setSalvando(true);
    const { error } = await supabase.from("produtos").update(campo === "codigo" ? { codigo: v } : { nome: v }).eq("id", produtoId);
    setSalvando(false);
    if (error) { toast.error("Não foi possível salvar. Só administradores podem editar produtos."); return; }
    toast.success(campo === "codigo" ? "SKU salvo" : "Nome salvo");
    await onSalvo();
  }
  return (
    <div className="flex items-center gap-1">
      <Input className="h-8 min-w-24 border-section/60" value={valor} placeholder={placeholder} aria-label={placeholder} maxLength={200} onChange={(e) => setValor(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salvar()} />
      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" disabled={!valor.trim() || salvando} onClick={salvar} aria-label="Salvar"><Check className="h-4 w-4" /></Button>
    </div>
  );
}

export function DetalhesDocumento({ tipo, id }: { tipo: Tipo; id: string }) {
  const c = CFG[tipo];
  const queryClient = useQueryClient();
  const chave = ["documento", tipo, id];
  const { data, isLoading, error } = useQuery({ queryKey: chave, queryFn: () => carregar(tipo, id) });
  const [ocupado, setOcupado] = useState(false);
  const [pendentes, setPendentesState] = useState<Pendente[]>([]);
  const [resolvendo, setResolvendo] = useState<number | null>(null);
  const [adicionando, setAdicionando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPendentesState(lerPendentes(tipo, id)); }, [tipo, id]);
  function setPendentes(lista: Pendente[]) { setPendentesState(lista); salvarPendentes(tipo, id, lista); }

  const atualizar = () => queryClient.invalidateQueries({ queryKey: chave });
  const doc = data?.doc;
  const editavel = doc?.status === c.planejado;
  const corTexto = "text-section";
  const corBorda = "border-section/70";
  const corIcone = "section-icon";
  const corLinha = "bg-section";

  async function removerItem(itemId: string) {
    const { error } = await db.from(c.itens).delete().eq("id", itemId);
    if (error) toast.error("Não foi possível remover o produto."); else await atualizar();
  }

  async function alternarPreparado(item: Item) {
    const novo = !item.preparado;
    queryClient.setQueryData(chave, (d: typeof data) => d && { ...d, doc: { ...d.doc, itens: d.doc.itens.map((x) => x.id === item.id ? { ...x, preparado: novo } : x) } });
    const { error } = await supabase.from("full_itens").update({ preparado: novo }).eq("id", item.id);
    if (error) { toast.error("Não foi possível salvar a marcação."); await atualizar(); }
  }

  async function salvarEnderecoEntrega(valor: string) {
    if (valor === (doc?.endereco_entrega ?? "")) return;
    const { error } = await supabase.from("pedidos").update({ endereco_entrega: valor }).eq("id", id);
    if (error) { toast.error("Não foi possível salvar o endereço de entrega."); return; }
    await atualizar();
    toast.success("Endereço de entrega salvo");
  }

  async function salvarDataPedido(ymd: string | null) {
    if (!ymd) return;
    const { error } = await supabase.from("pedidos").update({ data_pedido: ymd }).eq("id", id);
    if (error) { toast.error("Não foi possível salvar a data do pedido."); return; }
    await atualizar();
    toast.success("Data do pedido salva");
  }

  async function salvarDataPrevista(ymd: string | null) {
    const dataPrevista = ymd ? ymdParaInstanteSP(ymd) : null;
    const { error } = await supabase.from("full_cargas").update({ data_prevista: dataPrevista }).eq("id", id);
    if (error) { toast.error("Não foi possível salvar a data do Full."); return; }
    await atualizar();
    toast.success(dataPrevista ? "Data do Full salva" : "Data do Full removida");
  }

  async function importar(arquivo: File) {
    if (!data || !doc) return;
    setOcupado(true);
    try {
      let linhas, ml;
      try { ({ linhas, ml } = await lerDocumentoPdf(arquivo)); } catch { toast.error("Não foi possível ler esse PDF. Verifique se ele não é uma imagem escaneada ou protegido por senha."); return; }
      if (!linhas.length) { toast.error("Nenhum produto com código e quantidade foi encontrado nesse PDF."); return; }
      if (ml && tipo !== "full") { toast.error("Este PDF é uma lista de envio Full do Mercado Livre. Importe-o na tela Full."); return; }
      if (ml?.frete && tipo === "full") {
        if (doc.frete_ml && doc.frete_ml !== ml.frete && !confirm(`Este Full é do Frete #${doc.frete_ml}, mas o PDF é do Frete #${ml.frete}. Importar mesmo assim?`)) return;
        if (!doc.frete_ml) {
          const { error: e } = await db.from("full_cargas").update({ frete_ml: ml.frete, ml_total_produtos: ml.totalProdutos, ml_total_unidades: ml.totalUnidades }).eq("id", id);
          if (e) { toast.error(e.code === "23505" ? `O Frete #${ml.frete} já foi importado em outro Full desta empresa.` : e.message); return; }
        }
      }
      const { casados, pendentes: novos } = tipo === "pedido" ? casarEntreEmpresas(linhas, data.produtos, data.outros) : casarLinhas(linhas, data.produtos);
      const todos = [...data.produtos, ...data.outros];
      let adicionados = 0;
      for (const item of casados) {
        const produto = todos.find((p) => p.id === item.produtoId);
        if (produto && (await somarItem(tipo, id, produto, item.quantidade))) adicionados++;
      }
      await atualizar();
      toast.success(`${adicionados} ${adicionados === 1 ? "produto adicionado" : "produtos adicionados"} do PDF`);
      if (novos.length) toast.warning(`${novos.length} ${novos.length === 1 ? "item precisa" : "itens precisam"} de revisão`);
      setPendentes([...pendentes, ...novos]);
    } finally {
      setOcupado(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function baixar() {
    if (!doc) return;
    await gerarPdf({
      titulo: c.pdfTitulo, rotuloNumero: c.rotuloNumero, numero: `${c.prefixo} ${codigo(doc.numero)}`,
      empresa: tipo === "pedido" ? { ...doc.empresa, endereco: doc.endereco_entrega ?? "" } : doc.empresa,
      rotuloEndereco: tipo === "pedido" ? "Endereço de entrega" : "Endereço",
      data: ymdParaBr(dataDoc),
      marcas: Array.from(new Set(doc.itens.map((i) => i.produto.marca))),
      itens: doc.itens.map((i) => ({ cod: i.produto.cod, nome: i.produto.nome, quantidade: i.quantidade })),
      arquivo: `${c.prefixo.toLowerCase()}-${String(doc.numero).padStart(4, "0")}.pdf`,
    });
  }

  async function confirmar() {
    if (!doc?.itens.length) { toast.error("Adicione ao menos um produto."); return; }
    if (pendentes.length && !confirm(`Ainda há ${pendentes.length} ${pendentes.length === 1 ? "item do PDF não resolvido" : "itens do PDF não resolvidos"}. Eles NÃO entrarão no estoque. Continuar?`)) return;
    if (tipo === "full") {
      const falta = doc.itens.filter((i) => i.quantidade > i.produto.estoque);
      if (falta.length) { toast.error(`Estoque insuficiente: ${falta.map((i) => i.produto.codigo || i.produto.nome).join(", ")}.`); return; }
      if (divergencias.length && !confirm(`Divergência com o PDF:\n${divergencias.join("\n")}\n\nConfirmar o envio mesmo assim?`)) return;
    }
    const total = doc.itens.reduce((s, i) => s + i.quantidade, 0);
    const porEmpresa = new Map<string, number>();
    for (const i of doc.itens) porEmpresa.set(i.produto.empresa_nome, (porEmpresa.get(i.produto.empresa_nome) ?? 0) + i.quantidade);
    const destinos = tipo === "pedido" && porEmpresa.size > 1 ? `\n\nEntrada no estoque:\n${Array.from(porEmpresa, ([e, q]) => `• ${e}: ${q} un.`).join("\n")}` : "";
    if (!confirm(`${c.confirmar}: ${total} unidades?${destinos}\n\nO estoque será atualizado e esta ação não poderá ser desfeita.`)) return;
    setOcupado(true);
    const { error } = await db.rpc(c.rpc, { [c.rpcArg]: id });
    setOcupado(false);
    if (error) { toast.error(error.message); return; }
    await atualizar();
    toast.success("Estoque atualizado");
  }

  const dataDoc = tipo === "pedido" ? (doc?.data_pedido ?? hojeSP()) : doc?.data_prevista ? ymdEmSP(doc.data_prevista) : hojeSP();
  const atual = resolvendo !== null ? pendentes[resolvendo] : undefined;
  const somaItens = (doc?.itens ?? []).reduce((s, i) => s + i.quantidade, 0);
  const divergencias: string[] = [];
  if (doc?.ml_total_produtos != null && doc.itens.length !== doc.ml_total_produtos) divergencias.push(`Produtos: ${doc.itens.length} na lista, ${doc.ml_total_produtos} no PDF${pendentes.length ? ` (${pendentes.length} pendentes)` : ""}`);
  if (doc?.ml_total_unidades != null && somaItens !== doc.ml_total_unidades) divergencias.push(`Unidades: ${somaItens} na lista, ${doc.ml_total_unidades} no PDF`);

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
          <Link to={c.voltar}><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />{c.voltarTexto}</Link>
        </Button>

        <header className="mt-7 flex items-center gap-4">
          <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-md text-foreground ${corIcone}`}>{tipo === "full" ? <Truck className="h-9 w-9" /> : <PackagePlus className="h-9 w-9" />}</div>
          <div><h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">{c.titulo}</h1><p className="mt-1 text-muted-foreground">{c.sub}</p></div>
        </header>
        <div className={`mt-5 h-1 w-16 rounded-full ${corLinha}`} />

        {isLoading ? <p className="mt-10 text-muted-foreground">Carregando…</p> : error || !doc ? <p className="mt-10 text-dashboard-red">Não foi possível carregar.</p> : (
          <section className="mt-8 rounded-md border border-border bg-background/30 p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-6 border-b border-border pb-6 md:flex-row">
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground">{doc.empresa.nome}</h2>
                {tipo === "pedido" ? (
                  <label className="mt-2 grid gap-1 text-xs text-muted-foreground">Endereço de entrega
                    <Input key={doc.endereco_entrega} defaultValue={doc.endereco_entrega ?? ""} disabled={!editavel} maxLength={300} placeholder="Informe o endereço de entrega" className="w-full max-w-md text-sm text-foreground" onBlur={(e) => void salvarEnderecoEntrega(e.target.value.trim())} />
                  </label>
                ) : <p className="mt-2 text-muted-foreground">Endereço: {doc.empresa.endereco || "não cadastrado"}</p>}
                <p className="text-muted-foreground">CNPJ: {doc.empresa.cnpj || "não cadastrado"}</p>
                {tipo === "pedido" ? (
                  <label className="mt-2 grid gap-1 text-xs text-muted-foreground">Data do pedido
                    <CampoData valor={doc.data_pedido ?? null} disabled={!editavel} onSalvar={salvarDataPedido} />
                  </label>
                ) : null}
                {tipo === "full" && <p className="text-muted-foreground">Planejamento: {doc.nome}</p>}
                {tipo === "full" && (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    {doc.frete_ml && <p className="pb-2 text-muted-foreground">Frete <span className="font-semibold text-foreground">#{doc.frete_ml}</span></p>}
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      Data do Full
                      <CampoData valor={doc.data_prevista ? ymdEmSP(doc.data_prevista) : null} disabled={!editavel} permitirVazio onSalvar={salvarDataPrevista} />
                    </label>
                  </div>
                )}
              </div>
              <div className="md:text-right">
                <p className={`text-xs font-semibold tracking-wide ${corTexto}`}>{c.rotuloNumero}</p>
                <p className="font-display text-2xl font-semibold text-foreground">{c.prefixo} {codigo(doc.numero)}</p>
                <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); }} />
                  <Button variant="outline" className="gap-2 border-section/60 text-section" disabled={!editavel || ocupado} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Importar PDF</Button>
                  <Button variant="outline" className="gap-2 border-section/60 text-section" onClick={baixar}><Download className="h-4 w-4" />Baixar PDF</Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{c.ajuda}</p>
              </div>
            </div>

            {doc.frete_ml && (doc.ml_total_produtos != null || doc.ml_total_unidades != null) && (
              <div className={`mt-6 rounded-md border p-4 text-sm ${divergencias.length ? "border-dashboard-red/50 bg-dashboard-red-soft" : "border-dashboard-green/45 bg-dashboard-green-soft"}`}>
                <p className="flex items-center gap-2 font-medium text-foreground">{divergencias.length ? <AlertTriangle className="h-4 w-4 text-dashboard-red" /> : <Check className="h-4 w-4 text-dashboard-green" />}Conferência com o PDF</p>
                <p className="mt-1 text-muted-foreground">Produtos: {doc.itens.length} de {doc.ml_total_produtos ?? "—"} · Unidades: {somaItens} de {doc.ml_total_unidades ?? "—"}{pendentes.length ? ` · ${pendentes.length} pendente(s) com ${pendentes.reduce((s, p) => s + p.quantidade, 0)} un.` : ""}</p>
              </div>
            )}

            {editavel && pendentes.length > 0 && (
              <div className="mt-6 rounded-md border border-dashboard-red/50 bg-dashboard-red-soft p-4">
                <p className="flex items-center gap-2 font-medium text-foreground"><AlertTriangle className="h-4 w-4 text-dashboard-red" />{pendentes.length} {pendentes.length === 1 ? "item do PDF precisa" : "itens do PDF precisam"} de revisão</p>
                <div className="mt-3 grid gap-2">
                  {pendentes.map((p, i) => (
                    <div key={`${p.cod}-${i}`} className="grid gap-2 rounded-md border border-border bg-background/40 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                      <div className="min-w-0"><p className="truncate text-foreground">{p.nome}</p><p className="text-xs text-muted-foreground">{p.sku !== undefined ? `SKU ${p.sku || "—"} · ML ${p.codigoMl || "—"}${p.codigoUniversal ? ` · Universal ${p.codigoUniversal}` : ""}` : `COD ${p.cod}`} · {p.quantidade} un. · {p.incerto ? "leitura incerta, confira · " : ""}{p.opcoes.length ? `${p.opcoes.length} produtos com esse código — escolha o certo` : "não encontrado no cadastro"}</p></div>
                      <Button size="sm" variant="outline" className={corBorda} onClick={() => setResolvendo(i)}>{p.opcoes.length ? "Escolher produto" : "Cadastrar ou vincular"}</Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { if (confirm(`Descartar o item ${p.sku || p.cod || p.nome}? Ele não será incluído.`)) setPendentes(pendentes.filter((_, k) => k !== i)); }}>Descartar</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-background/50 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                  <tr>{tipo === "full" && <th className="w-10 px-3" />}<th className="px-4 py-3">COD</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">PRODUTO</th><th className="px-4 py-3">QUANTIDADE</th>{tipo === "pedido" && <th className="px-4 py-3">EMPRESA DE DESTINO</th>}{tipo === "full" && <th className="px-4 py-3">ESTOQUE</th>}{editavel && <th className="w-10" />}</tr>
                </thead>
                <tbody>
                  {doc.itens.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto ainda.</td></tr> : doc.itens.map((i) => (
                    <tr key={i.id} className={`border-t border-border text-foreground transition-colors ${tipo === "full" && i.preparado ? "bg-dashboard-green-soft shadow-[inset_3px_0_0_var(--dashboard-green)]" : ""}`}>
                      {tipo === "full" && <td className="px-3"><button type="button" role="checkbox" aria-checked={!!i.preparado} aria-label={`Preparado: ${i.produto.nome}`} disabled={!editavel} onClick={() => void alternarPreparado(i)} className={`flex h-5 w-5 items-center justify-center rounded border transition-colors disabled:opacity-60 ${i.preparado ? "border-dashboard-green bg-dashboard-green text-background" : "border-muted-foreground/50 hover:border-dashboard-green"}`}>{i.preparado && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</button></td>}
                      <td className="px-4 py-3">{i.produto.cod || "—"}</td>
                      <td className="px-4 py-3">{i.produto.codigo ? i.produto.codigo : <CampoProduto key={`sku-${i.produto.id}`} produtoId={i.produto.id} campo="codigo" placeholder="Informar SKU" onSalvo={atualizar} />}</td>
                      <td className="px-4 py-3">{i.produto.nome ? i.produto.nome : <CampoProduto key={`nome-${i.produto.id}`} produtoId={i.produto.id} campo="nome" placeholder="Informar nome" onSalvo={atualizar} />}<span className="block text-xs text-muted-foreground">{i.produto.marca}</span></td>
                      <td className={`px-4 py-3 font-semibold ${corTexto}`}>{i.quantidade}</td>
                      {tipo === "pedido" && <td className="px-4 py-3">{i.produto.empresa_id === doc.empresa.id ? <span className="text-muted-foreground">{i.produto.empresa_nome}</span> : <span className="rounded-md border border-section/60 bg-section-soft px-2 py-1 text-xs font-semibold text-section">{i.produto.empresa_nome} · outra empresa</span>}</td>}
                      {tipo === "full" && <td className={`px-4 py-3 ${editavel && i.quantidade > i.produto.estoque ? "font-semibold text-dashboard-red" : "text-muted-foreground"}`}>{i.produto.estoque}{editavel && i.quantidade > i.produto.estoque ? " (insuficiente)" : ""}</td>}
                      {editavel && <td className="px-2"><Button variant="ghost" size="icon" onClick={() => removerItem(i.id)} aria-label={`Remover ${i.produto.nome}`}><Trash2 className="h-4 w-4" /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editavel ? <>
              <Button variant="outline" onClick={() => setAdicionando(true)} className={`mt-6 h-11 gap-2 ${corBorda} ${corTexto}`}><Plus className="h-4 w-4" />Adicionar produto</Button>
              <div className="mt-6 flex justify-end border-t border-border pt-6">
                <Button onClick={confirmar} disabled={ocupado || !doc.itens.length} className="h-11 gap-2 bg-section px-8 text-primary-foreground hover:bg-section/90"><Check className="h-4 w-4" />{c.confirmar}</Button>
              </div>
            </> : <p className={`mt-6 text-sm ${corTexto}`}>{tipo === "full" ? "Envio confirmado." : "Recebimento confirmado."} Esta lista não pode mais ser alterada.</p>}
          </section>
        )}
      </div>

      {adicionando && data && doc && (
        <AdicionarProdutoModal tipo={tipo} docId={id} empresa={doc.empresa} produtos={data.produtos} onFechar={() => setAdicionando(false)} onAdicionado={atualizar} />
      )}

      {atual && resolvendo !== null && data && doc && (
        <NovoProdutoModal
          key={`${atual.cod}-${resolvendo}`}
          linha={atual}
          opcoes={atual.opcoes}
          restantes={pendentes.length - 1}
          tipo={tipo}
          empresa={doc.empresa}
          produtos={atual.opcoes.length ? [...data.produtos, ...data.outros] : data.produtos}
          onFechar={() => setResolvendo(null)}
          onPronto={async (produto) => {
            const ok = await somarItem(tipo, id, produto, atual.quantidade);
            if (ok) { await atualizar(); setPendentes(pendentes.filter((_, k) => k !== resolvendo)); setResolvendo(null); }
          }}
        />
      )}
    </div>
  );
}
