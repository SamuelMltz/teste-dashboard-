import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, ChevronDown, Package, PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Empresa = { id: string; nome: string };
type Produto = { id: string; nome: string; codigo: string; cod: string; estoque: number; marca_id: string; marca: string; empresa_id: string };
type Item = { id: string; pedido_id: string; produto_id: string; quantidade: number; produto: Produto };
type Pedido = { id: string; numero: number; nome: string; empresa_id: string; empresa: string; status: "planejado" | "recebido"; created_at: string; received_at: string | null; itens: Item[] };

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Pedidos — Compras de fornecedores" },
      { name: "description", content: "Monte pedidos a fornecedores e confirme a entrada dos produtos no estoque." },
      { property: "og:title", content: "Pedidos — Compras de fornecedores" },
      { property: "og:description", content: "Monte pedidos a fornecedores e confirme a entrada dos produtos no estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PedidosPage,
});

async function carregarPedidos(): Promise<{ empresas: Empresa[]; produtos: Produto[]; pedidos: Pedido[] }> {
  const [empresasRes, produtosRes, pedidosRes, itensRes] = await Promise.all([
    supabase.from("empresas").select("id, nome").order("ordem"),
    supabase.from("produtos").select("id, nome, codigo, cod, estoque, marca_id, marcas!inner(nome, empresa_id)").order("ordem"),
    supabase.from("pedidos").select("id, numero, nome, empresa_id, status, created_at, received_at, empresas(nome)").order("created_at", { ascending: false }),
    supabase.from("pedido_itens").select("id, pedido_id, produto_id, quantidade"),
  ]);
  const erro = empresasRes.error ?? produtosRes.error ?? pedidosRes.error ?? itensRes.error;
  if (erro) throw erro;

  const empresas = (empresasRes.data ?? []) as Empresa[];
  const produtos = (produtosRes.data ?? []).map((p) => {
    const marca = Array.isArray(p.marcas) ? p.marcas[0] : p.marcas;
    return { id: p.id, nome: p.nome, codigo: p.codigo, cod: p.cod, estoque: p.estoque, marca_id: p.marca_id, marca: marca?.nome ?? "", empresa_id: marca?.empresa_id ?? "" };
  });
  const produtoPorId = new Map(produtos.map((produto) => [produto.id, produto]));
  const itens = (itensRes.data ?? []).flatMap((item) => {
    const produto = produtoPorId.get(item.produto_id);
    return produto ? [{ ...item, produto }] : [];
  });
  const pedidos = (pedidosRes.data ?? []).map((pedido) => {
    const empresa = Array.isArray(pedido.empresas) ? pedido.empresas[0] : pedido.empresas;
    return { ...pedido, empresa: empresa?.nome ?? "", itens: itens.filter((item) => item.pedido_id === pedido.id) } as Pedido;
  });
  return { empresas, produtos, pedidos };
}

function codigo(numero: number) {
  return `#${String(numero).padStart(4, "0")}`;
}

function PedidosPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["pedidos"], queryFn: carregarPedidos });
  const [nome, setNome] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [aberta, setAberta] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  async function atualizar() {
    await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
  }

  async function criarPedido() {
    if (!nome.trim() || !empresaId) { toast.error("Selecione a empresa e a marca."); return; }
    const empresa = data?.empresas.find((item) => item.id === empresaId);
    if (!empresa) { toast.error("Selecione uma empresa válida."); return; }
    setCriando(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) { setCriando(false); toast.error("Sua sessão expirou."); return; }
    const { data: pedido, error } = await supabase.from("pedidos").insert({ nome: nome.trim(), fornecedor: empresa.nome, empresa_id: empresaId, created_by: user.id }).select("id").single();
    setCriando(false);
    if (error) { toast.error("Não foi possível criar o pedido."); return; }
    setNome(""); setEmpresaId(""); setAberta(pedido.id);
    await atualizar();
    toast.success("Pedido criado");
  }

  const marcasDaEmpresa = useMemo(() => Array.from(new Set((data?.produtos ?? []).filter((p) => p.empresa_id === empresaId).map((p) => p.marca))), [data, empresaId]);
  const planejadas = data?.pedidos.filter((pedido) => pedido.status === "planejado") ?? [];
  const confirmadas = data?.pedidos.filter((pedido) => pedido.status === "recebido") ?? [];

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Voltar ao início</Link>
        </Button>

        <header className="mt-7 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-dashboard-amber-icon text-foreground shadow-dashboard-amber"><PackagePlus className="h-9 w-9" /></div>
          <div><h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Pedidos</h1><p className="mt-1 text-muted-foreground">Monte as listas e confirme quando os produtos chegarem.</p></div>
        </header>
        <div className="mt-5 h-1 w-16 rounded-full bg-dashboard-amber" />

        <section className="mt-8 border-y border-border py-6" aria-labelledby="novo-pedido">
          <h2 id="novo-pedido" className="font-display text-xl font-semibold text-foreground">Novo pedido</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <select value={empresaId} onChange={(event) => { setEmpresaId(event.target.value); setNome(""); }} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="" className="bg-background">Selecione a empresa</option>
              {data?.empresas.map((empresa) => <option key={empresa.id} value={empresa.id} className="bg-background">{empresa.nome}</option>)}
            </select>
            <select value={nome} onChange={(event) => setNome(event.target.value)} disabled={!empresaId} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
              <option value="" className="bg-background">Selecione a marca</option>
              {marcasDaEmpresa.map((marca) => <option key={marca} value={marca} className="bg-background">{marca}</option>)}
            </select>
            <Button onClick={criarPedido} disabled={criando} className="gerenciar-primary gap-2"><Plus className="h-4 w-4" />Criar pedido</Button>
          </div>
        </section>

        <section className="mt-8" aria-labelledby="planejamentos">
          <div className="flex items-end justify-between"><div><h2 id="planejamentos" className="font-display text-2xl font-semibold text-foreground">Pedidos em aberto</h2><p className="text-sm text-muted-foreground">{planejadas.length} {planejadas.length === 1 ? "pedido em preparação" : "pedidos em preparação"}</p></div></div>
          <div className="mt-4 grid gap-4">
            {isLoading ? <p className="py-10 text-muted-foreground">Carregando pedidos…</p> : planejadas.length === 0 ? <div className="rounded-md border border-dashed border-border p-10 text-center text-muted-foreground">Nenhum pedido em aberto.</div> : planejadas.map((pedido) => (
              <PedidoPlanejado key={pedido.id} pedido={pedido} produtos={data?.produtos ?? []} aberta={aberta === pedido.id} onToggle={() => setAberta(aberta === pedido.id ? null : pedido.id)} onAtualizar={atualizar} />
            ))}
          </div>
        </section>

        <section className="mt-10 border-t border-border pt-8" aria-labelledby="historico">
          <h2 id="historico" className="font-display text-2xl font-semibold text-foreground">Histórico de recebimentos</h2>
          <div className="mt-4 grid gap-3">
            {confirmadas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum pedido foi recebido ainda.</p> : confirmadas.map((pedido) => (
              <article key={pedido.id} className="grid gap-3 rounded-md border border-dashboard-green/35 bg-dashboard-green-soft p-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-dashboard-green-icon text-foreground"><Check className="h-5 w-5" /></div>
                <div><p className="font-display text-lg font-semibold text-foreground">{codigo(pedido.numero)} · {pedido.nome}</p><p className="text-sm text-muted-foreground">{pedido.empresa} · {pedido.itens.length} {pedido.itens.length === 1 ? "produto" : "produtos"}</p></div>
                <p className="text-sm text-dashboard-green">Recebido em {pedido.received_at ? new Date(pedido.received_at).toLocaleDateString("pt-BR") : "—"}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PedidoPlanejado({ pedido, produtos, aberta, onToggle, onAtualizar }: { pedido: Pedido; produtos: Produto[]; aberta: boolean; onToggle: () => void; onAtualizar: () => Promise<void> }) {
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [ocupado, setOcupado] = useState(false);
  const disponiveis = useMemo(() => produtos.filter((produto) => produto.empresa_id === pedido.empresa_id && produto.marca === pedido.nome && !pedido.itens.some((item) => item.produto_id === produto.id)), [produtos, pedido]);
  const total = pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);

  async function adicionar() {
    const qtd = Number(quantidade);
    const produto = produtos.find((item) => item.id === produtoId);
    if (!produto || !Number.isInteger(qtd) || qtd <= 0) { toast.error("Escolha um produto e uma quantidade válida."); return; }
        setOcupado(true);
    const { error } = await supabase.from("pedido_itens").insert({ pedido_id: pedido.id, produto_id: produto.id, quantidade: qtd });
    setOcupado(false);
    if (error) { toast.error(error.message); return; }
    setProdutoId(""); setQuantidade("1"); await onAtualizar();
  }

  async function removerItem(id: string) {
    const { error } = await supabase.from("pedido_itens").delete().eq("id", id);
    if (error) { toast.error("Não foi possível remover o produto."); return; }
    await onAtualizar();
  }

  async function excluir() {
    if (!confirm(`Excluir o pedido ${codigo(pedido.numero)}?`)) return;
    const { error } = await supabase.from("pedidos").delete().eq("id", pedido.id);
    if (error) { toast.error("Não foi possível excluir o pedido."); return; }
    await onAtualizar(); toast.success("Pedido excluído");
  }

  async function confirmar() {
    if (!pedido.itens.length) { toast.error("Adicione ao menos um produto."); return; }
    if (!confirm(`Confirmar o recebimento de ${total} unidades? As unidades serão somadas ao estoque e esta ação não poderá ser desfeita.`)) return;
    setOcupado(true);
    const { error } = await supabase.rpc("confirmar_recebimento_pedido", { _pedido_id: pedido.id });
    setOcupado(false);
    if (error) { toast.error(error.message); return; }
    await onAtualizar();
    toast.success("Pedido recebido e estoque atualizado");
  }

  return (
    <article className="overflow-hidden rounded-md border border-dashboard-amber/45 bg-dashboard-amber-soft">
      <div className="flex items-center gap-3 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-dashboard-amber-icon text-foreground"><PackagePlus className="h-6 w-6" /></div>
        <Button type="button" variant="ghost" onClick={onToggle} className="h-auto min-w-0 flex-1 justify-start p-0 text-left hover:bg-transparent"><span><span className="block font-display text-lg font-semibold text-foreground">{codigo(pedido.numero)} · {pedido.nome}</span><span className="block text-sm font-normal text-muted-foreground">{pedido.empresa} · {pedido.itens.length} {pedido.itens.length === 1 ? "produto" : "produtos"} · {total} unidades</span></span></Button>
        <Button variant="ghost" size="icon" onClick={onToggle} aria-label={aberta ? "Recolher pedido" : "Abrir pedido"}><ChevronDown className={`h-5 w-5 transition-transform ${aberta ? "rotate-180" : ""}`} /></Button>
        <Button variant="ghost" size="icon" onClick={excluir} aria-label="Excluir pedido" className="text-dashboard-red hover:text-dashboard-red"><Trash2 className="h-5 w-5" /></Button>
      </div>
      {aberta && <div className="border-t border-dashboard-amber/25 bg-background/25 p-5">
        <div className="grid gap-2">
          {pedido.itens.map((item) => <div key={item.id} className="grid gap-3 rounded-md border border-border bg-background/35 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div><p className="font-medium text-foreground">{item.produto.nome}</p><p className="text-xs text-muted-foreground">{item.produto.marca} · SKU {item.produto.codigo || "—"} · COD {item.produto.cod || "—"} · estoque atual: {item.produto.estoque}</p></div><span className="font-display text-lg font-semibold text-dashboard-amber">{item.quantidade} un.</span><Button variant="ghost" size="icon" onClick={() => removerItem(item.id)} aria-label={`Remover ${item.produto.nome}`}><Trash2 className="h-4 w-4" /></Button></div>)}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
          <select value={produtoId} onChange={(event) => setProdutoId(event.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="" className="bg-background">Adicionar produto</option>{disponiveis.map((produto) => <option key={produto.id} value={produto.id} className="bg-background">{produto.nome} ({produto.estoque})</option>)}</select>
          <Input type="number" min={1} value={quantidade} onChange={(event) => setQuantidade(event.target.value)} aria-label="Quantidade" />
          <Button variant="outline" onClick={adicionar} disabled={ocupado} className="gap-2 border-dashboard-amber/55"><Plus className="h-4 w-4" />Adicionar</Button>
        </div>
        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-border pt-5 sm:flex-row sm:items-center"><p className="text-sm text-muted-foreground"><Package className="mr-2 inline h-4 w-4" />Total planejado: <strong className="text-foreground">{total} unidades</strong></p><Button onClick={confirmar} disabled={ocupado || !pedido.itens.length} className="gerenciar-primary gap-2"><Check className="h-4 w-4" />Confirmar recebimento</Button></div>
      </div>}
    </article>
  );
}