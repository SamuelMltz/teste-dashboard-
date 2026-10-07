import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, FileText, PackagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BotaoImportarPdf } from "@/components/documento/BotaoImportarPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { criarDocumentoPorPdf } from "@/lib/importar-documento";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";

type Pedido = { id: string; numero: number; nome: string; empresa_id: string; status: "planejado" | "recebido"; received_at: string | null; itens: { quantidade: number }[] };

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({ meta: [
    { title: "Pedidos — Compras de fornecedores" },
    { name: "description", content: "Monte pedidos a fornecedores e confirme a entrada dos produtos no estoque." },
    { property: "og:title", content: "Pedidos — Compras de fornecedores" },
    { property: "og:description", content: "Monte pedidos a fornecedores e confirme a entrada dos produtos no estoque." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PedidosPage,
});

const codigo = (numero: number) => `#${String(numero).padStart(4, "0")}`;

async function carregarPedidos(): Promise<Pedido[]> {
  const { data, error } = await supabase.from("pedidos").select("id, numero, nome, empresa_id, status, received_at, pedido_itens(quantidade)").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((pedido) => ({ ...pedido, itens: pedido.pedido_itens ?? [] }));
}

function PedidosPage() {
  const empresaAtual = useEmpresaObrigatoria();
  const empresaId = empresaAtual?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["pedidos", empresaId], queryFn: carregarPedidos });
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const atualizar = () => queryClient.invalidateQueries({ queryKey: ["pedidos"] });
  const planejados = data.filter((pedido) => pedido.empresa_id === empresaId && pedido.status === "planejado");
  const recebidos = data.filter((pedido) => pedido.empresa_id === empresaId && pedido.status === "recebido");

  async function criarPedido() {
    if (!empresaAtual) return;
    setCriando(true);
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) { setCriando(false); toast.error("Sua sessão expirou."); return; }
    const { data: pedido, error } = await supabase.from("pedidos").insert({ nome: nome.trim() || "Novo pedido", fornecedor: empresaAtual.nome, empresa_id: empresaAtual.id, created_by: usuario.user.id }).select("id").single();
    setCriando(false);
    if (error) { toast.error("Não foi possível criar o pedido."); return; }
    setNome("");
    await atualizar();
    navigate({ to: "/pedidos/$id", params: { id: pedido.id } });
  }

  async function excluir(id: string, numero: number) {
    if (!confirm(`Excluir o pedido ${codigo(numero)}?`)) return;
    const { error } = await supabase.from("pedidos").delete().eq("id", id);
    if (error) toast.error("Não foi possível excluir o pedido.");
    else { await atualizar(); toast.success("Pedido excluído"); }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground"><Link to="/"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Voltar ao início</Link></Button>
        <header className="mt-7 flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-dashboard-amber-icon text-foreground shadow-dashboard-amber"><PackagePlus className="h-9 w-9" /></div><div><h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Pedidos</h1><p className="mt-1 text-muted-foreground">Monte as listas e confirme quando os produtos chegarem.</p></div></header>
        <div className="mt-5 h-1 w-16 rounded-full bg-dashboard-amber" />

        <section className="mt-8 border-y border-border py-6" aria-labelledby="novo-pedido">
          <h2 id="novo-pedido" className="font-display text-xl font-semibold text-foreground">Novo pedido</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(160px,0.4fr)_minmax(0,1fr)_auto_auto] sm:items-center">
            <p className="text-sm text-muted-foreground">{empresaAtual?.nome}</p>
            <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome do pedido (opcional)" maxLength={120} />
            <Button onClick={criarPedido} disabled={criando || !empresaId} className="gerenciar-primary gap-2"><Plus className="h-4 w-4" />Criar pedido</Button>
            {empresaAtual && <BotaoImportarPdf rotulo="Importar PDF" onArquivo={async (arquivo) => { const id = await criarDocumentoPorPdf("pedido", arquivo, empresaAtual); if (id) { await atualizar(); navigate({ to: "/pedidos/$id", params: { id } }); } }} />}
          </div>
        </section>

        <Lista titulo="Pedidos em aberto" vazio="Nenhum pedido em aberto." pedidos={planejados} carregando={isLoading} editavel onExcluir={excluir} />
        <Lista titulo="Histórico de recebimentos" vazio="Nenhum pedido foi recebido ainda." pedidos={recebidos} />
      </div>
    </div>
  );
}

function Lista({ titulo, vazio, pedidos, carregando = false, editavel = false, onExcluir }: { titulo: string; vazio: string; pedidos: Pedido[]; carregando?: boolean; editavel?: boolean; onExcluir?: (id: string, numero: number) => void }) {
  return <section className="mt-9 border-t border-border pt-8" aria-label={titulo}>
    <h2 className="font-display text-2xl font-semibold text-foreground">{titulo}</h2><p className="text-sm text-muted-foreground">{pedidos.length} {pedidos.length === 1 ? "registro" : "registros"}</p>
    <div className="mt-4 grid gap-3">{carregando ? <p className="py-10 text-muted-foreground">Carregando…</p> : pedidos.length === 0 ? <div className="rounded-md border border-dashed border-border p-10 text-center text-muted-foreground">{vazio}</div> : pedidos.map((pedido) => {
      const total = pedido.itens.reduce((soma, item) => soma + item.quantidade, 0);
      return <article key={pedido.id} className={`flex items-center gap-3 rounded-md border p-3 ${editavel ? "border-dashboard-amber/45 bg-dashboard-amber-soft" : "border-dashboard-green/35 bg-dashboard-green-soft"}`}>
        <Link to="/pedidos/$id" params={{ id: pedido.id }} className="group grid min-w-0 flex-1 gap-3 rounded-md p-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
          <span className={`flex h-11 w-11 items-center justify-center rounded-md ${editavel ? "bg-dashboard-amber-icon" : "bg-dashboard-green-icon"}`}>{editavel ? <PackagePlus className="h-6 w-6" /> : <Check className="h-5 w-5" />}</span>
          <span className="min-w-0"><span className="block truncate font-display text-lg font-semibold text-foreground">{codigo(pedido.numero)} · {pedido.nome}</span><span className="block text-sm text-muted-foreground">{pedido.status === "planejado" ? "Em preparação" : "Recebido"} · {pedido.itens.length} {pedido.itens.length === 1 ? "produto" : "produtos"} · {total} unidades</span></span>
          <span className="flex items-center gap-3 text-sm text-muted-foreground">{pedido.received_at ? `Recebido em ${new Date(pedido.received_at).toLocaleDateString("pt-BR")}` : "Abrir detalhes"}<FileText className="h-5 w-5 text-foreground transition-transform group-hover:translate-x-1" /></span>
        </Link>
        {editavel && onExcluir && <Button variant="ghost" size="icon" onClick={() => onExcluir(pedido.id, pedido.numero)} aria-label={`Excluir ${codigo(pedido.numero)}`} className="shrink-0 text-dashboard-red hover:text-dashboard-red"><Trash2 className="h-5 w-5" /></Button>}
      </article>;
    })}</div>
  </section>;
}
