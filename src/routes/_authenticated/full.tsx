import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Check, FileText, Package, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { hojeSP, ymdParaInstanteSP } from "@/lib/datas";

import { BotaoImportarPdf } from "@/components/documento/BotaoImportarPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { avaliarPrazoFull } from "@/lib/full-prazos";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";
import { criarDocumentoPorPdf } from "@/lib/importar-documento";

type Carga = {
  id: string;
  numero: number;
  nome: string;
  empresa_id: string;
  status: "planejada" | "confirmada";
  frete_ml: string | null;
  data_prevista: string | null;
  confirmed_at: string | null;
  itens: { quantidade: number }[];
};

export const Route = createFileRoute("/_authenticated/full")({
  head: () => ({ meta: [
    { title: "Full — Planejamento de entregas" },
    { name: "description", content: "Planeje cargas Full e confirme a baixa dos produtos no estoque." },
    { property: "og:title", content: "Full — Planejamento de entregas" },
    { property: "og:description", content: "Planeje cargas Full e confirme a baixa dos produtos no estoque." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: FullPage,
});

const codigo = (numero: number) => `#${String(numero).padStart(4, "0")}`;

async function carregarFull(): Promise<Carga[]> {
  const { data, error } = await supabase
    .from("full_cargas")
    .select("id, numero, nome, empresa_id, status, frete_ml, data_prevista, confirmed_at, full_itens(quantidade)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((carga) => ({ ...carga, itens: carga.full_itens ?? [] }));
}

function FullPage() {
  const empresaAtual = useEmpresaObrigatoria();
  const empresaId = empresaAtual?.id ?? "";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["full", empresaId], queryFn: carregarFull });
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);

  const atualizar = () => queryClient.invalidateQueries({ queryKey: ["full"] });
  const planejadas = data.filter((carga) => carga.empresa_id === empresaId && carga.status === "planejada");
  const confirmadas = data.filter((carga) => carga.empresa_id === empresaId && carga.status === "confirmada");

  async function criarCarga() {
    if (!empresaAtual) return;
    setCriando(true);
    const { data: usuario } = await supabase.auth.getUser();
    if (!usuario.user) { setCriando(false); toast.error("Sua sessão expirou."); return; }
    const { data: carga, error } = await supabase.from("full_cargas").insert({
      nome: nome.trim() || "Novo Full",
      empresa_id: empresaAtual.id,
      created_by: usuario.user.id,
      data_prevista: ymdParaInstanteSP(hojeSP()),
    }).select("id").single();
    setCriando(false);
    if (error) { toast.error("Não foi possível criar o Full."); return; }
    setNome("");
    await atualizar();
    navigate({ to: "/full/$id", params: { id: carga.id } });
  }

  async function excluir(id: string, numero: number) {
    if (!confirm(`Excluir o planejamento ${codigo(numero)}?`)) return;
    const { error } = await supabase.from("full_cargas").delete().eq("id", id);
    if (error) toast.error("Não foi possível excluir o planejamento.");
    else { await atualizar(); toast.success("Planejamento excluído"); }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground"><Link to="/"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Voltar ao início</Link></Button>
        <header className="mt-7 flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md section-icon text-foreground"><Truck className="h-9 w-9" /></div>
          <div><h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Full</h1><p className="mt-1 text-muted-foreground">Planeje as cargas antes de confirmar o envio.</p></div>
        </header>
        <div className="mt-5 h-1 w-16 rounded-full bg-section" />

        <section className="mt-8 border-y border-border py-6" aria-labelledby="nova-carga">
          <h2 id="nova-carga" className="font-display text-xl font-semibold text-foreground">Novo planejamento</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(160px,0.4fr)_minmax(0,1fr)_auto_auto] sm:items-center">
            <p className="text-sm text-muted-foreground">{empresaAtual?.nome}</p>
            <Input value={nome} onChange={(event) => setNome(event.target.value)} placeholder="Nome do Full (opcional)" maxLength={120} />
            <Button onClick={criarCarga} disabled={criando || !empresaId} className="bg-section text-primary-foreground hover:bg-section/90 gap-2"><Plus className="h-4 w-4" />Criar Full</Button>
            {empresaAtual && <BotaoImportarPdf rotulo="Importar PDF" onArquivo={async (arquivo) => { const id = await criarDocumentoPorPdf("full", arquivo, empresaAtual); if (id) { await atualizar(); navigate({ to: "/full/$id", params: { id } }); } }} />}
          </div>
        </section>

        <Lista titulo="Planejamentos" vazio="Nenhum planejamento em aberto." cargas={planejadas} carregando={isLoading} editavel onExcluir={excluir} />
        <Lista titulo="Histórico de envios" vazio="Nenhuma carga foi enviada ainda." cargas={confirmadas} />
      </div>
    </div>
  );
}

function Lista({ titulo, vazio, cargas, carregando = false, editavel = false, onExcluir }: { titulo: string; vazio: string; cargas: Carga[]; carregando?: boolean; editavel?: boolean; onExcluir?: (id: string, numero: number) => void }) {
  return (
    <section className="mt-9 border-t border-border pt-8 first:border-0" aria-label={titulo}>
      <h2 className="font-display text-2xl font-semibold text-foreground">{titulo}</h2>
      <p className="text-sm text-muted-foreground">{cargas.length} {cargas.length === 1 ? "registro" : "registros"}</p>
      <div className="mt-4 grid gap-3">
        {carregando ? <p className="py-10 text-muted-foreground">Carregando…</p> : cargas.length === 0 ? <div className="rounded-md border border-dashed border-border p-10 text-center text-muted-foreground">{vazio}</div> : cargas.map((carga) => {
          const total = carga.itens.reduce((soma, item) => soma + item.quantidade, 0);
          const prazo = carga.data_prevista ? avaliarPrazoFull(carga.data_prevista) : null;
          return <article key={carga.id} className={`flex items-center gap-3 rounded-md border p-3 ${editavel ? "border-section/45 bg-section-soft" : "border-dashboard-green/35 bg-dashboard-green-soft"}`}>
            <Link to="/full/$id" params={{ id: carga.id }} className="group grid min-w-0 flex-1 gap-3 rounded-md p-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
              <span className={`flex h-11 w-11 items-center justify-center rounded-md ${editavel ? "bg-section-icon" : "bg-dashboard-green-icon"}`}>{editavel ? <Truck className="h-6 w-6" /> : <Check className="h-5 w-5" />}</span>
              <span className="min-w-0"><span className="block truncate font-display text-lg font-semibold text-foreground">{codigo(carga.numero)} · {carga.nome}</span><span className="block text-sm text-muted-foreground">{carga.status === "planejada" ? "Em preparação" : "Enviado"} · {carga.itens.length} {carga.itens.length === 1 ? "produto" : "produtos"} · {total} unidades</span></span>
              <span className="flex items-center gap-4 text-sm"><span className={prazo?.prazo === "normal" ? "text-muted-foreground" : prazo ? "text-dashboard-red" : "text-muted-foreground"}>{prazo ? <><CalendarDays className="mr-1 inline h-4 w-4" />{prazo.rotulo}</> : carga.confirmed_at ? `Enviado em ${new Date(carga.confirmed_at).toLocaleDateString("pt-BR")}` : "Sem data"}</span><FileText className="h-5 w-5 transition-transform group-hover:translate-x-1" /></span>
            </Link>
            {editavel && onExcluir && <Button variant="ghost" size="icon" onClick={() => onExcluir(carga.id, carga.numero)} aria-label={`Excluir ${codigo(carga.numero)}`} className="shrink-0 text-dashboard-red hover:text-dashboard-red"><Trash2 className="h-5 w-5" /></Button>}
          </article>;
        })}
      </div>
    </section>
  );
}
