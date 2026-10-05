import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, Package, Plus, Send, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Empresa = { id: string; nome: string };
type Produto = { id: string; nome: string; codigo: string; estoque: number; marca_id: string; marca: string; empresa_id: string };
type Item = { id: string; carga_id: string; produto_id: string; quantidade: number; produto: Produto };
type Carga = { id: string; numero: number; nome: string; empresa_id: string; empresa: string; status: "planejada" | "confirmada"; created_at: string; confirmed_at: string | null; itens: Item[] };

export const Route = createFileRoute("/_authenticated/full")({
  head: () => ({
    meta: [
      { title: "Full — Planejamento de entregas" },
      { name: "description", content: "Planeje cargas Full e confirme a baixa dos produtos no estoque." },
      { property: "og:title", content: "Full — Planejamento de entregas" },
      { property: "og:description", content: "Planeje cargas Full e confirme a baixa dos produtos no estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FullPage,
});

async function carregarFull(): Promise<{ empresas: Empresa[]; produtos: Produto[]; cargas: Carga[] }> {
  const [empresasRes, produtosRes, cargasRes, itensRes] = await Promise.all([
    supabase.from("empresas").select("id, nome").order("ordem"),
    supabase.from("produtos").select("id, nome, codigo, estoque, marca_id, marcas!inner(nome, empresa_id)").order("ordem"),
    supabase.from("full_cargas").select("id, numero, nome, empresa_id, status, created_at, confirmed_at, empresas(nome)").order("created_at", { ascending: false }),
    supabase.from("full_itens").select("id, carga_id, produto_id, quantidade"),
  ]);
  const erro = empresasRes.error ?? produtosRes.error ?? cargasRes.error ?? itensRes.error;
  if (erro) throw erro;

  const empresas = (empresasRes.data ?? []) as Empresa[];
  const produtos = (produtosRes.data ?? []).map((p) => {
    const marca = Array.isArray(p.marcas) ? p.marcas[0] : p.marcas;
    return { id: p.id, nome: p.nome, codigo: p.codigo, estoque: p.estoque, marca_id: p.marca_id, marca: marca?.nome ?? "", empresa_id: marca?.empresa_id ?? "" };
  });
  const produtoPorId = new Map(produtos.map((produto) => [produto.id, produto]));
  const itens = (itensRes.data ?? []).flatMap((item) => {
    const produto = produtoPorId.get(item.produto_id);
    return produto ? [{ ...item, produto }] : [];
  });
  const cargas = (cargasRes.data ?? []).map((carga) => {
    const empresa = Array.isArray(carga.empresas) ? carga.empresas[0] : carga.empresas;
    return { ...carga, empresa: empresa?.nome ?? "", itens: itens.filter((item) => item.carga_id === carga.id) } as Carga;
  });
  return { empresas, produtos, cargas };
}

function codigo(numero: number) {
  return `#${String(numero).padStart(4, "0")}`;
}

function FullPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["full"], queryFn: carregarFull });
  const [nome, setNome] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  async function atualizar() {
    await queryClient.invalidateQueries({ queryKey: ["full"] });
  }

  async function criarCarga() {
    if (!nome.trim() || !empresaId) { toast.error("Informe o nome e a empresa da carga."); return; }
    setCriando(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setCriando(false); toast.error("Sua sessão expirou."); return; }
    const { data: carga, error } = await supabase.from("full_cargas").insert({ nome: nome.trim(), empresa_id: empresaId, created_by: user.id }).select("id").single();
    setCriando(false);
    if (error) { toast.error("Não foi possível criar o planejamento."); return; }
    setNome(""); setEmpresaId(""); setAberta(carga.id);
    await atualizar();
    toast.success("Planejamento Full criado");
  }

  const planejadas = data?.cargas.filter((carga) => carga.status === "planejada") ?? [];
  const confirmadas = data?.cargas.filter((carga) => carga.status === "confirmada") ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Voltar ao início</Link>
        </Button>

        <header className="mt-7 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-dashboard-amber-icon text-foreground shadow-dashboard-amber"><Truck className="h-9 w-9" /></div>
          <div><h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Full</h1><p className="mt-1 text-muted-foreground">Planeje as cargas antes de confirmar o envio.</p></div>
        </header>
        <div className="mt-5 h-1 w-16 rounded-full bg-dashboard-amber" />

        <section className="mt-8 border-y border-border py-6" aria-labelledby="nova-carga">
          <h2 id="nova-carga" className="font-display text-xl font-semibold text-foreground">Novo planejamento</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)_auto]">
            <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome da carga" maxLength={120} />
            <select value={empresaId} onChange={(event) => setEmpresaId(event.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="" className="bg-background">Selecione a empresa</option>
              {data?.empresas.map((empresa) => <option key={empresa.id} value={empresa.id} className="bg-background">{empresa.nome}</option>)}
            </select>
            <Button onClick={criarCarga} disabled={criando} className="gerenciar-primary gap-2"><Plus className="h-4 w-4" />Criar Full</Button>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="planejamentos">
          <div className="flex items-end justify-between"><div><h2 id="planejamentos" className="font-display text-2xl font-semibold text-foreground">Planejamentos</h2><p className="text-sm text-muted-foreground">{planejadas.length} {planejadas.length === 1 ? "carga em preparação" : "cargas em preparação"}</p></div></div>
          <div className="mt-4 grid gap-4">
            {isLoading ? <p className="py-10 text-muted-foreground">Carregando planejamentos…</p> : planejadas.length === 0 ? <div className="rounded-md border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum planejamento em aberto.</div> : planejadas.map((carga) => (
              <CargaPlanejada key={carga.id} carga={carga} produtos={data?.produtos ?? []} aberta={aberta === carga.id} onToggle={() => setAberta(aberta === carga.id ? null : carga.id)} onAtualizar={atualizar} />
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8" aria-labelledby="historico">
          <h2 id="historico" className="font-display text-2xl font-semibold text-foreground">Histórico de envios</h2>
          <div className="mt-4 grid gap-3">
            {confirmadas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma carga foi enviada ainda.</p> : confirmadas.map((carga) => (
              <article key={carga.id} className="grid gap-3 rounded-md border border-dashboard-green/35 bg-dashboard-green-soft p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-dashboard-green-icon text-foreground"><Check className="h-5 w-5" /></div>
                <div><p className="font-display text-lg font-semibold text-foreground">{codigo(carga.numero)} · {carga.nome}</p><p className="text-sm text-muted-foreground">{carga.empresa} · {carga.itens.length} {carga.itens.length === 1 ? "produto" : "produtos"}</p></div>
                <p className="text-sm text-dashboard-green">Enviado em {carga.confirmed_at ? new Date(carga.confirmed_at).toLocaleDateString("pt-BR") : "—"}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function CargaPlanejada({ carga, produtos, aberta, onToggle, onAtualizar }: { carga: Carga; produtos: Produto[]; aberta: boolean; onToggle: () => void; onAtualizar: () => Promise<void> }) {
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [nomeCarga, setNomeCarga] = useState(carga.nome);
  const [ocupado, setOcupado] = useState(false);
  const disponiveis = useMemo(() => produtos.filter((produto) => produto.empresa_id === carga.empresa_id && !carga.itens.some((item) => item.produto_id === produto.id)), [produtos, carga]);
  const total = carga.itens.reduce((soma, item) => soma + item.quantidade, 0);

  async function adicionar() {
    const qtd = Number(quantidade);
    const produto = produtos.find((item) => item.id === produtoId);
    if (!produto || !Number.isInteger(qtd) || qtd <= 0) { toast.error("Escolha um produto e uma quantidade válida."); return; }
    if (qtd > produto.estoque) { toast.error(`Há somente ${produto.estoque} unidades disponíveis.`); return; }
    setOcupado(true);
    const { error } = await supabase.from("full_itens").insert({ carga_id: carga.id, produto_id: produto.id, quantidade: qtd });
    setOcupado(false);
    if (error) { toast.error(error.message); return; }
    setProdutoId(""); setQuantidade("1"); await onAtualizar();
  }

  async function removerItem(id: string) {
    const { error } = await supabase.from("full_itens").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o produto."); return; }
    await onAtualizar();
  }

  async function salvarNome() {
    const valor = nomeCarga.trim();
    if (!valor) { setNomeCarga(carga.nome); toast.error("O nome da carga não pode ficar vazio."); return; }
    if (valor === carga.nome) return;
    const { error } = await supabase.from("full_cargas").update({ nome: valor }).eq("id", carga.id);
    if (error) { setNomeCarga(carga.nome); toast.error("Não foi possível alterar o nome."); return; }
    await onAtualizar();
    toast.success("Nome da carga atualizado");
  }

  async function excluir() {
    if (!confirm(`Excluir o planejamento ${codigo(carga.numero)}?`)) return;
    const { error } = await supabase.from("full_cargas").delete().eq("id", carga.id);
    if (error) { toast.error("Não foi possível excluir o planejamento."); return; }
    await onAtualizar(); toast.success("Planejamento excluído");
  }

  async function confirmar() {
    if (!carga.itens.length) { toast.error("Adicione ao menos um produto."); return; }
    if (!confirm(`Confirmar o envio de ${total} unidades? O estoque será atualizado e esta ação não poderá ser desfeita.`)) return;
    setOcupado(true);
    const { error } = await supabase.rpc("confirmar_carga_full", { _carga_id: carga.id });
    setOcupado(false);
    if (error) { toast.error(error.message); return; }
    await onAtualizar();
    toast.success("Carga enviada e estoque atualizado");
  }

  return (
    <article className="overflow-hidden rounded-md border border-dashboard-amber/45 bg-dashboard-amber-soft">
      <div className="flex items-center gap-3 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-dashboard-amber-icon text-foreground"><Truck className="h-6 w-6" /></div>
        <Button type="button" variant="ghost" onClick={onToggle} className="h-auto min-w-0 flex-1 justify-start p-0 text-left hover:bg-transparent"><span><span className="block font-display text-lg font-semibold text-foreground">{codigo(carga.numero)} · {carga.nome}</span><span className="block text-sm font-normal text-muted-foreground">{carga.empresa} · {carga.itens.length} {carga.itens.length === 1 ? "produto" : "produtos"} · {total} unidades</span></span></Button>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label={aberta ? "Recolher carga" : "Abrir carga"}><ChevronDown className={`h-5 w-5 transition-transform ${aberta ? "rotate-180" : ""}`} /></Button>
        <Button variant="ghost" size="icon" onClick={excluir} aria-label="Excluir planejamento" className="text-dashboard-red hover:text-dashboard-red"><Trash2 className="h-5 w-5" /></Button>
      </div>
      {aberta && <div className="border-t border-dashboard-amber/25 bg-background/25 p-5">
        <div className="mb-4"><label className="mb-2 block text-xs text-muted-foreground" htmlFor={`nome-${carga.id}`}>Nome do planejamento</label><Input id={`nome-${carga.id}`} value={nomeCarga} maxLength={120} onChange={(event) => setNomeCarga(event.target.value)} onBlur={salvarNome} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div>
        <div className="grid gap-2">
          {carga.itens.map((item) => <div key={item.id} className="grid gap-3 rounded-md border border-border bg-background/35 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div><p className="font-medium text-foreground">{item.produto.nome}</p><p className="text-xs text-muted-foreground">{item.produto.marca} · {item.produto.codigo || "Sem código"} · disponível: {item.produto.estoque}</p></div><span className="font-display text-lg font-semibold text-dashboard-amber">{item.quantidade} un.</span><Button variant="ghost" size="icon" onClick={() => removerItem(item.id)} aria-label={`Remover ${item.produto.nome}`}><Trash2 className="h-4 w-4" /></Button></div>)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
          <select value={produtoId} onChange={(event) => setProdutoId(event.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="" className="bg-background">Adicionar produto</option>{disponiveis.map((produto) => <option key={produto.id} value={produto.id} className="bg-background">{produto.marca} · {produto.nome} ({produto.estoque})</option>)}</select>
          <Input type="number" min={1} value={quantidade} onChange={(event) => setQuantidade(event.target.value)} aria-label="Quantidade" />
          <Button variant="outline" onClick={adicionar} disabled={ocupado} className="gap-2 border-dashboard-amber/55"><Plus className="h-4 w-4" />Adicionar</Button>
        </div>
        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center"><p className="text-sm text-muted-foreground"><Package className="mr-2 inline h-4 w-4" />Total planejado: <strong className="text-foreground">{total} unidades</strong></p><Button onClick={confirmar} disabled={ocupado || !carga.itens.length} className="gerenciar-primary gap-2"><Send className="h-4 w-4" />Confirmar envio</Button></div>
      </div>}
    </article>
  );
}