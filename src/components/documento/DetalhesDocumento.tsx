import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Download, FileText, Link2, PackagePlus, Plus, Trash2, Truck, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lerPdf, type LinhaPdf } from "@/lib/pdf-import";
import { gerarPdf } from "@/lib/pdf-export";

export type Tipo = "full" | "pedido";

type Produto = { id: string; nome: string; codigo: string; cod: string; estoque: number; marca_id: string; marca: string; empresa_id: string };
type Item = { id: string; produto_id: string; quantidade: number; produto: Produto };
type Doc = { id: string; numero: number; nome: string; status: string; created_at: string; empresa: { id: string; nome: string; endereco: string; cnpj: string }; itens: Item[] };
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

async function carregar(tipo: Tipo, id: string): Promise<{ doc: Doc; produtos: Produto[]; marcas: Marca[] }> {
  const c = CFG[tipo];
  const [docRes, itensRes, produtosRes, marcasRes] = await Promise.all([
    db.from(c.tabela).select("id, numero, nome, status, created_at, empresas(id, nome, endereco, cnpj)").eq("id", id).single(),
    db.from(c.itens).select("id, produto_id, quantidade").eq(c.fk, id).order("created_at"),
    supabase.from("produtos").select("id, nome, codigo, cod, estoque, marca_id, marcas!inner(nome, empresa_id)").order("ordem"),
    supabase.from("marcas").select("id, nome, empresa_id").order("ordem"),
  ]);
  const erro = docRes.error ?? itensRes.error ?? produtosRes.error ?? marcasRes.error;
  if (erro) throw erro;
  const produtos: Produto[] = (produtosRes.data ?? []).map((p) => {
    const m = Array.isArray(p.marcas) ? p.marcas[0] : p.marcas;
    return { id: p.id, nome: p.nome, codigo: p.codigo, cod: p.cod, estoque: p.estoque, marca_id: p.marca_id, marca: m?.nome ?? "", empresa_id: m?.empresa_id ?? "" };
  });
  const porId = new Map(produtos.map((p) => [p.id, p]));
  const empresa = Array.isArray(docRes.data.empresas) ? docRes.data.empresas[0] : docRes.data.empresas;
  const itens: Item[] = (itensRes.data ?? []).flatMap((i: { id: string; produto_id: string; quantidade: number }) => {
    const produto = porId.get(i.produto_id);
    return produto ? [{ ...i, produto }] : [];
  });
  return {
    doc: { ...docRes.data, empresa, itens },
    produtos: produtos.filter((p) => p.empresa_id === empresa.id),
    marcas: (marcasRes.data ?? []).filter((m) => m.empresa_id === empresa.id),
  };
}

export function DetalhesDocumento({ tipo, id }: { tipo: Tipo; id: string }) {
  const c = CFG[tipo];
  const queryClient = useQueryClient();
  const chave = ["documento", tipo, id];
  const { data, isLoading, error } = useQuery({ queryKey: chave, queryFn: () => carregar(tipo, id) });
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [pendentes, setPendentes] = useState<LinhaPdf[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const atualizar = () => queryClient.invalidateQueries({ queryKey: chave });
  const doc = data?.doc;
  const editavel = doc?.status === c.planejado;
  const corTexto = c.cor === "amber" ? "text-dashboard-amber" : "text-dashboard-green";
  const corBorda = c.cor === "amber" ? "border-dashboard-amber/70" : "border-dashboard-green/70";
  const corIcone = c.cor === "amber" ? "bg-dashboard-amber-icon shadow-dashboard-amber" : "bg-dashboard-green-icon";
  const corLinha = c.cor === "amber" ? "bg-dashboard-amber" : "bg-dashboard-green";

  async function somarItem(produto: Produto, quantidade: number, itensAtuais: Item[]) {
    const existente = itensAtuais.find((i) => i.produto_id === produto.id);
    const res = existente
      ? await db.from(c.itens).update({ quantidade: existente.quantidade + quantidade }).eq("id", existente.id)
      : await db.from(c.itens).insert({ [c.fk]: id, produto_id: produto.id, quantidade });
    if (res.error) { toast.error(`${produto.nome}: ${res.error.message}`); return false; }
    return true;
  }

  async function adicionar() {
    const produto = data?.produtos.find((p) => p.id === produtoId);
    const n = Number(qtd);
    if (!produto || !Number.isInteger(n) || n <= 0) { toast.error("Escolha um produto e uma quantidade válida."); return; }
    setOcupado(true);
    const ok = await somarItem(produto, n, doc?.itens ?? []);
    setOcupado(false);
    if (ok) { setProdutoId(""); setQtd(""); await atualizar(); }
  }

  async function removerItem(itemId: string) {
    const { error } = await db.from(c.itens).delete().eq("id", itemId);
    if (error) toast.error("Não foi possível remover o produto."); else await atualizar();
  }

  async function importar(arquivo: File) {
    if (!data || !doc) return;
    setOcupado(true);
    try {
      const linhas = await lerPdf(arquivo);
      if (!linhas.length) { toast.error("Nenhum produto com código foi encontrado nesse PDF."); return; }
      const porCod = new Map(data.produtos.filter((p) => p.cod.trim()).map((p) => [p.cod.trim().toLowerCase(), p]));
      const naoEncontrados: LinhaPdf[] = [];
      let adicionados = 0;
      let itens = [...doc.itens];
      for (const l of linhas) {
        const produto = porCod.get(l.cod.toLowerCase());
        if (!produto) { naoEncontrados.push(l); continue; }
        if (await somarItem(produto, l.quantidade, itens)) {
          adicionados++;
          const ex = itens.find((i) => i.produto_id === produto.id);
          itens = ex ? itens.map((i) => (i === ex ? { ...i, quantidade: i.quantidade + l.quantidade } : i)) : [...itens, { id: "", produto_id: produto.id, quantidade: l.quantidade, produto }];
        }
      }
      await atualizar();
      toast.success(`${adicionados} ${adicionados === 1 ? "produto adicionado" : "produtos adicionados"} do PDF`);
      if (naoEncontrados.length) toast.warning(`${naoEncontrados.length} ${naoEncontrados.length === 1 ? "código não reconhecido" : "códigos não reconhecidos"}`);
      setPendentes(naoEncontrados);
    } catch {
      toast.error("Não foi possível ler esse PDF.");
    } finally {
      setOcupado(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function baixar() {
    if (!doc) return;
    await gerarPdf({
      titulo: c.pdfTitulo, rotuloNumero: c.rotuloNumero, numero: `${c.prefixo} ${codigo(doc.numero)}`,
      empresa: doc.empresa, data: new Date().toLocaleDateString("pt-BR"),
      marcas: Array.from(new Set(doc.itens.map((i) => i.produto.marca))),
      itens: doc.itens.map((i) => ({ cod: i.produto.cod, nome: i.produto.nome, quantidade: i.quantidade })),
      arquivo: `${c.prefixo.toLowerCase()}-${String(doc.numero).padStart(4, "0")}.pdf`,
    });
  }

  async function confirmar() {
    if (!doc?.itens.length) { toast.error("Adicione ao menos um produto."); return; }
    const total = doc.itens.reduce((s, i) => s + i.quantidade, 0);
    if (!confirm(`${c.confirmar}: ${total} unidades? O estoque será atualizado e esta ação não poderá ser desfeita.`)) return;
    setOcupado(true);
    const { error } = await db.rpc(c.rpc, { [c.rpcArg]: id });
    setOcupado(false);
    if (error) { toast.error(error.message); return; }
    await atualizar();
    toast.success("Estoque atualizado");
  }

  const disponiveis = useMemo(() => data?.produtos ?? [], [data]);

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
                <p className="mt-2 text-muted-foreground">Endereço: {doc.empresa.endereco || "não cadastrado"}</p>
                <p className="text-muted-foreground">CNPJ: {doc.empresa.cnpj || "não cadastrado"}</p>
                <p className="text-muted-foreground">Data: {new Date().toLocaleDateString("pt-BR")}</p>
                {tipo === "full" && <p className="text-muted-foreground">Planejamento: {doc.nome}</p>}
              </div>
              <div className="md:text-right">
                <p className={`text-xs font-semibold tracking-wide ${corTexto}`}>{c.rotuloNumero}</p>
                <p className="font-display text-2xl font-semibold text-foreground">{c.prefixo} {codigo(doc.numero)}</p>
                <div className="mt-4 flex flex-wrap gap-2 md:justify-end">
                  <input ref={fileRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importar(f); }} />
                  <Button variant="outline" className="gap-2" disabled={!editavel || ocupado} onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Importar PDF</Button>
                  <Button variant="outline" className="gap-2" onClick={baixar}><Download className="h-4 w-4" />Baixar PDF</Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{c.ajuda}</p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="bg-background/50 text-left text-xs font-semibold tracking-wide text-muted-foreground">
                  <tr><th className="px-4 py-3">COD</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">PRODUTO</th><th className="px-4 py-3">QUANTIDADE</th>{editavel && <th className="w-10" />}</tr>
                </thead>
                <tbody>
                  {doc.itens.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nenhum produto ainda.</td></tr> : doc.itens.map((i) => (
                    <tr key={i.id} className="border-t border-border text-foreground">
                      <td className="px-4 py-3">{i.produto.cod || "—"}</td><td className="px-4 py-3">{i.produto.codigo || "—"}</td>
                      <td className="px-4 py-3">{i.produto.nome}<span className="block text-xs text-muted-foreground">{i.produto.marca}</span></td>
                      <td className={`px-4 py-3 font-semibold ${corTexto}`}>{i.quantidade}</td>
                      {editavel && <td className="px-2"><Button variant="ghost" size="icon" onClick={() => removerItem(i.id)} aria-label={`Remover ${i.produto.nome}`}><Trash2 className="h-4 w-4" /></Button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {editavel ? <>
              <h3 className="mt-8 font-display text-lg font-semibold text-foreground">Adicionar produto</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
                <select value={produtoId} onChange={(e) => setProdutoId(e.target.value)} className="h-10 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="" className="bg-background">Selecione o produto</option>
                  {disponiveis.map((p) => <option key={p.id} value={p.id} className="bg-background">{p.marca} · {p.nome} {p.cod ? `(COD ${p.cod})` : ""} — estoque {p.estoque}</option>)}
                </select>
                <Input type="number" min={1} placeholder="Qtd." value={qtd} onChange={(e) => setQtd(e.target.value)} aria-label="Quantidade" className="h-10" />
                <Button variant="outline" onClick={adicionar} disabled={ocupado} className={`h-10 gap-2 ${corBorda} ${corTexto}`}><Plus className="h-4 w-4" />Adicionar</Button>
              </div>
              <div className="mt-6 flex justify-end border-t border-border pt-6">
                <Button onClick={confirmar} disabled={ocupado || !doc.itens.length} className="h-11 gap-2 bg-foreground px-8 text-background hover:bg-foreground/90"><Check className="h-4 w-4" />{c.confirmar}</Button>
              </div>
            </> : <p className={`mt-6 text-sm ${corTexto}`}>{tipo === "full" ? "Envio confirmado." : "Recebimento confirmado."} Esta lista não pode mais ser alterada.</p>}
          </section>
        )}
      </div>

      {pendentes[0] && data && doc && (() => { const atual = pendentes[0]; return (
        <NovoProdutoModal
          key={atual.cod}
          linha={atual}
          restantes={pendentes.length - 1}
          tipo={tipo}
          empresa={doc.empresa}
          marcas={data.marcas}
          produtos={data.produtos}
          onFechar={() => setPendentes((p) => p.slice(1))}
          onPronto={async (produto) => {
            const ok = await somarItem(produto, atual.quantidade, doc.itens);
            if (ok) { await atualizar(); setPendentes((p) => p.slice(1)); }
          }}
        />
      ); })()}
    </div>
  );
}

function NovoProdutoModal({ linha, restantes, tipo, empresa, marcas, produtos, onFechar, onPronto }: {
  linha: LinhaPdf; restantes: number; tipo: Tipo; empresa: { id: string; nome: string }; marcas: Marca[]; produtos: Produto[];
  onFechar: () => void; onPronto: (p: Produto) => Promise<void>;
}) {
  const [modo, setModo] = useState<"novo" | "vincular">("novo");
  const [nome, setNome] = useState(linha.nome);
  const [cod, setCod] = useState(linha.cod);
  const [sku, setSku] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [existenteId, setExistenteId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const destino = tipo === "full" ? "ao envio" : "ao pedido";

  async function salvar() {
    setSalvando(true);
    try {
      if (modo === "novo") {
        if (!nome.trim() || !cod.trim() || !sku.trim() || !marcaId) { toast.error("Preencha todos os campos obrigatórios."); return; }
        const ordem = produtos.filter((p) => p.marca_id === marcaId).length;
        const { data, error } = await supabase.from("produtos").insert({ nome: nome.trim(), cod: cod.trim(), codigo: sku.trim(), marca_id: marcaId, ordem }).select("id, nome, codigo, cod, estoque, marca_id").single();
        if (error) { toast.error(error.message.includes("row-level") ? "Só administradores podem cadastrar produtos." : error.message); return; }
        const marca = marcas.find((m) => m.id === marcaId);
        await onPronto({ ...data, marca: marca?.nome ?? "", empresa_id: empresa.id });
        toast.success("Produto cadastrado");
      } else {
        const produto = produtos.find((p) => p.id === existenteId);
        if (!produto) { toast.error("Escolha o produto."); return; }
        const { error } = await supabase.from("produtos").update({ cod: linha.cod }).eq("id", produto.id);
        if (error) { toast.error(error.message.includes("row-level") ? "Só administradores podem editar produtos." : error.message); return; }
        await onPronto({ ...produto, cod: linha.cod });
        toast.success("COD vinculado ao produto");
      }
    } finally { setSalvando(false); }
  }

  const corBg = tipo === "full" ? "bg-dashboard-amber-soft border-dashboard-amber/45" : "bg-dashboard-green-soft border-dashboard-green/45";
  const corTx = tipo === "full" ? "text-dashboard-amber" : "text-dashboard-green";
  const sel = "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-md border border-border bg-estoque-canvas p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-foreground ${tipo === "full" ? "bg-dashboard-amber-icon" : "bg-dashboard-green-icon"}`}><PackagePlus className="h-7 w-7" /></div>
          <div className="flex-1"><h2 id="titulo-modal" className="font-display text-2xl font-semibold text-foreground">{modo === "novo" ? "Cadastrar novo produto" : "Vincular a um cadastro existente"}</h2><p className="text-sm text-muted-foreground">Este item do PDF não foi encontrado no cadastro.{restantes > 0 ? ` Faltam mais ${restantes}.` : ""}</p></div>
          <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Pular este item"><X className="h-5 w-5" /></Button>
        </div>

        <div className={`mt-6 flex gap-4 rounded-md border p-4 ${corBg}`}>
          <FileText className={`h-6 w-6 shrink-0 ${corTx}`} />
          <div><p className={`text-xs font-semibold ${corTx}`}>Item identificado no PDF</p><p className="font-medium text-foreground">{linha.nome}</p><p className="text-xs text-muted-foreground">COD: {linha.cod} · Quantidade: {linha.quantidade}</p></div>
        </div>

        {modo === "novo" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-foreground sm:col-span-2">Nome do produto *<Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-10" /></label>
            <label className="grid gap-1 text-sm text-foreground">COD do fornecedor *<Input value={cod} onChange={(e) => setCod(e.target.value)} className="h-10" /></label>
            <label className="grid gap-1 text-sm text-foreground">SKU interno *<Input value={sku} placeholder="Informe o SKU" onChange={(e) => setSku(e.target.value)} className="h-10" /></label>
            <label className="grid gap-1 text-sm text-foreground">Empresa *<select disabled className={sel}><option className="bg-background">{empresa.nome}</option></select></label>
            <label className="grid gap-1 text-sm text-foreground">Marca *<select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} className={sel}><option value="" className="bg-background">Selecione a marca</option>{marcas.map((m) => <option key={m.id} value={m.id} className="bg-background">{m.nome}</option>)}</select></label>
          </div>
        ) : (
          <label className="mt-5 grid gap-1 text-sm text-foreground">Produto já cadastrado *
            <select value={existenteId} onChange={(e) => setExistenteId(e.target.value)} className={sel}><option value="" className="bg-background">Selecione o produto</option>{produtos.map((p) => <option key={p.id} value={p.id} className="bg-background">{p.marca} · {p.nome} {p.codigo ? `(SKU ${p.codigo})` : ""}</option>)}</select>
            <span className="text-xs text-muted-foreground">O COD {linha.cod} será gravado nesse produto.</span>
          </label>
        )}

        <button type="button" onClick={() => setModo(modo === "novo" ? "vincular" : "novo")} className={`mt-5 inline-flex items-center gap-2 text-sm underline underline-offset-4 ${corTx}`}>
          <Link2 className="h-4 w-4" />{modo === "novo" ? "O produto já existe? Vincular a um cadastro existente" : "Cadastrar como novo produto"}
        </button>

        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">O produto será adicionado {destino}. O estoque será atualizado após {tipo === "full" ? "confirmar o envio" : "confirmar o recebimento"}.</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onFechar}>Pular</Button>
          <Button onClick={salvar} disabled={salvando} className="gerenciar-primary">{modo === "novo" ? `Cadastrar e adicionar ${destino}` : `Vincular e adicionar ${destino}`}</Button>
        </div>
      </div>
    </div>
  );
}
