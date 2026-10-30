import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Boxes, Building2, Info, Plus, Search, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";
import { BarraEmpresa } from "@/components/BarraEmpresa";
import { AnunciosMl } from "@/components/AnunciosMl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brParaYmd, hojeSP, ymdParaBr } from "@/lib/datas";
import { MARGEM_MINIMA_PCT, margemPromocional, nivelMargem, precoPromocional, statusPromocao, lucroPromocional, type Percentuais, type NivelMargem, type StatusPromocao } from "@/lib/promocoes";

export const Route = createFileRoute("/_authenticated/promocoes")({
  head: () => ({
    meta: [
      { title: "Promoções — Dashboard" },
      { name: "description", content: "Gerencie promoções por produto e acompanhe a margem de cada oferta." },
      { property: "og:title", content: "Promoções — Dashboard" },
      { property: "og:description", content: "Gerencie promoções por produto e acompanhe a margem de cada oferta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Promocoes,
});

type Produto = { id: string; nome: string; codigo: string; preco_custo: number | null; preco_venda: number | null; marca_id: string; marcas: { nome: string } | null };
type Promo = { id: string; nome: string; desconto_pct: number; data_inicio: string; data_fim: string; encerrada: boolean; produto_id: string; imposto_pct: number | null; custo_fixo_pct: number | null; ads_pct: number | null; ml_status: string; produtos: Produto | null };

const brl = (v: number | null) => v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const COR_MARGEM: Record<NivelMargem, string> = { boa: "text-dashboard-green", baixa: "text-dashboard-amber", negativa: "text-destructive", "sem-dados": "text-muted-foreground" };
const ROTULO_STATUS: Record<StatusPromocao, string> = { ativa: "Ativa", agendada: "Agendada", encerrada: "Encerrada" };
const ROTULO_ML: Record<string, string> = { nao_enviada: "Não enviada", pendente: "Pendente", enviada: "Publicada", erro: "Erro" };
const COR_STATUS: Record<StatusPromocao, string> = {
  ativa: "border-dashboard-green/40 bg-dashboard-green/10 text-dashboard-green",
  agendada: "border-primary/40 bg-primary/10 text-primary",
  encerrada: "border-border bg-muted text-muted-foreground",
};

function Promocoes() {
  const empresa = useEmpresaObrigatoria();
  const qc = useQueryClient();
  const hoje = hojeSP();
  const [aba, setAba] = useState<"produtos" | "promocoes" | "historico">("produtos");
  const [marca, setMarca] = useState("todas");
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [nivel, setNivel] = useState("todos");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [novo, setNovo] = useState(false);

  const { data: marcas = [] } = useQuery({
    queryKey: ["promo-marcas", empresa?.id], enabled: !!empresa,
    queryFn: async () => (await supabase.from("marcas").select("id, nome").eq("empresa_id", empresa!.id).order("ordem")).data ?? [],
  });
  const { data: pctEmpresa } = useQuery({
    queryKey: ["empresa-pct", empresa?.id], enabled: !!empresa,
    queryFn: async () => (await supabase.from("empresas").select("imposto_pct, custo_fixo_pct, ads_pct").eq("id", empresa!.id).maybeSingle()).data as Percentuais | null,
  });
  const { data: promos = [] } = useQuery({
    queryKey: ["promocoes", empresa?.id], enabled: !!empresa,
    queryFn: async () => {
      const { data, error } = await supabase.from("promocoes")
        .select("id, nome, desconto_pct, data_inicio, data_fim, encerrada, produto_id, imposto_pct, custo_fixo_pct, ads_pct, ml_status, produtos(id, nome, codigo, preco_custo, preco_venda, marca_id, marcas(nome))")
        .eq("empresa_id", empresa!.id).order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Promo[];
    },
  });

  const linhas = useMemo(() => promos.map((p) => {
    const pr = p.produtos;
    const pct: Percentuais = { imposto_pct: p.imposto_pct ?? pctEmpresa?.imposto_pct ?? null, custo_fixo_pct: p.custo_fixo_pct ?? pctEmpresa?.custo_fixo_pct ?? null, ads_pct: p.ads_pct ?? pctEmpresa?.ads_pct ?? null };
    const res = lucroPromocional(pr?.preco_venda ?? null, pr?.preco_custo ?? null, Number(p.desconto_pct), pct);
    const margem = res?.margem ?? null;
    return { ...p, pct, lucro: res?.lucro ?? null, st: statusPromocao(p, hoje), margem, nivel: nivelMargem(margem), preco: precoPromocional(pr?.preco_venda ?? null, Number(p.desconto_pct)) };
  }), [promos, hoje, pctEmpresa]);

  const deY = de ? brParaYmd(de) : null, ateY = ate ? brParaYmd(ate) : null;
  const filtradas = linhas.filter((l) => {
    if (aba === "promocoes" ? l.st === "encerrada" : l.st !== "encerrada") return false;
    if (marca !== "todas" && l.produtos?.marca_id !== marca) return false;
    if (status !== "todos" && l.st !== status) return false;
    if (nivel !== "todos" && l.nivel !== nivel) return false;
    if (deY && l.data_fim < deY) return false;
    if (ateY && l.data_inicio > ateY) return false;
    const q = busca.trim().toLowerCase();
    return !q || [l.nome, l.produtos?.nome, l.produtos?.codigo].some((t) => t?.toLowerCase().includes(q));
  });
  const ativas = linhas.filter((l) => l.st === "ativa").length;

  async function encerrar(id: string, encerrada: boolean) {
    const { error } = await supabase.from("promocoes").update({ encerrada }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["promocoes"] });
  }

  if (!empresa) return null;
  return (
    <div className="min-h-screen bg-estoque-canvas">
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" asChild className="-ml-3 gap-2 text-muted-foreground"><Link to="/"><ArrowLeft className="h-4 w-4" />Voltar ao início</Link></Button><BarraEmpresa /></div>
        <header className="mt-7 flex items-center gap-4">
          <div className="section-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-md"><Tag className="h-7 w-7" /></div>
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Promoções</h1>
        </header>
        <div role="tablist" className="mt-5 flex gap-6 border-b border-border">
          {(["produtos", "promocoes", "historico"] as const).map((a) => (
            <Button key={a} variant="ghost" role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className="section-tab h-12 rounded-none px-3">{a === "produtos" ? "Produtos" : a === "promocoes" ? "Campanhas internas" : "Histórico"}</Button>
          ))}
        </div>
        {aba === "produtos" ? <AnunciosMl empresaId={empresa.id} pct={pctEmpresa ?? null} /> : (<>
        <p className="mt-6 flex items-start gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />Promoções planejadas no sistema: escolha o produto e o % de desconto; o lucro desconta custo, imposto, custo fixo e Ads (definidos em Configurações).</p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">{empresa.nome} · {ativas} {ativas === 1 ? "promoção ativa" : "promoções ativas"}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.6fr_1fr_1fr_0.8fr_0.8fr_auto] lg:items-end">
          <Campo rotulo="Marca"><Select value={marca} onValueChange={setMarca}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as marcas</SelectItem>{marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></Campo>
          <Campo rotulo="Buscar"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Produto, SKU ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} /></div></Campo>
          <Campo rotulo="Status"><Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="ativa">Ativa</SelectItem><SelectItem value="agendada">Agendada</SelectItem><SelectItem value="encerrada">Encerrada</SelectItem></SelectContent></Select></Campo>
          <Campo rotulo="Margem"><Select value={nivel} onValueChange={setNivel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas</SelectItem><SelectItem value="boa">Boa</SelectItem><SelectItem value="baixa">Baixa</SelectItem><SelectItem value="negativa">Prejuízo</SelectItem><SelectItem value="sem-dados">Sem valores</SelectItem></SelectContent></Select></Campo>
          <Campo rotulo="De"><Input placeholder="DD/MM" value={de} onChange={(e) => setDe(e.target.value)} /></Campo>
          <Campo rotulo="Até"><Input placeholder="DD/MM" value={ate} onChange={(e) => setAte(e.target.value)} /></Campo>
          <Button className="gap-2" onClick={() => setNovo(true)}><Plus className="h-4 w-4" />Nova promoção</Button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[1080px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr><th className="px-4 py-3 font-medium">Marca</th><th className="px-4 py-3 font-medium">Promoção</th><th className="px-4 py-3 font-medium">Desconto</th><th className="px-4 py-3 font-medium">Preço</th><th className="px-4 py-3 font-medium">Imposto</th><th className="px-4 py-3 font-medium">Custo fixo</th><th className="px-4 py-3 font-medium">Ads</th><th className="px-4 py-3 font-medium">Lucro</th><th className="px-4 py-3 font-medium">Margem</th><th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium">Período</th><th className="px-4 py-3 font-medium">Mercado Livre</th><th className="px-4 py-3" /></tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && <tr><td colSpan={13} className="px-4 py-10 text-center text-muted-foreground">{aba === "promocoes" ? "Nenhuma promoção ativa ou agendada." : "Nenhuma promoção encerrada."}</td></tr>}
              {filtradas.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{l.produtos?.marcas?.nome ?? "—"}</td>
                  <td className="px-4 py-3"><p className="font-medium text-foreground">{l.nome || l.produtos?.nome}</p><p className="text-xs text-muted-foreground">{l.produtos?.codigo} · {l.produtos?.nome}</p></td>
                  <td className="px-4 py-3 font-medium">{Number(l.desconto_pct)}%</td>
                  <td className="px-4 py-3"><span className="text-foreground">{brl(l.preco)}</span><span className="ml-1 text-xs text-muted-foreground line-through">{brl(l.produtos?.preco_venda ?? null)}</span></td>
                  {(["imposto_pct", "custo_fixo_pct", "ads_pct"] as const).map((k) => <td key={k} className="px-4 py-3 text-muted-foreground">{l.pct[k] == null ? "—" : `${Number(l.pct[k])}%`}</td>)}
                  <td className={`px-4 py-3 font-medium ${COR_MARGEM[l.nivel]}`}>{brl(l.lucro)}</td>
                  <td className={`px-4 py-3 font-medium ${COR_MARGEM[l.nivel]}`}>{l.margem == null ? "Sem valores" : `${l.margem}%`}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs ${COR_STATUS[l.st]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{ROTULO_STATUS[l.st]}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{ymdParaBr(l.data_inicio).slice(0, 5)} a {ymdParaBr(l.data_fim).slice(0, 5)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{ROTULO_ML[l.ml_status] ?? "Não enviada"}</td>
                  <td className="px-4 py-3 text-right">{l.encerrada
                    ? <Button size="sm" variant="ghost" onClick={() => encerrar(l.id, false)}>Reativar</Button>
                    : l.st !== "encerrada" && <Button size="sm" variant="ghost" onClick={() => encerrar(l.id, true)}>Encerrar</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>)}


        <div className="mt-6 grid gap-4 rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground sm:grid-cols-3">
          <p className="flex items-center gap-3"><AlertCircle className="h-5 w-5 shrink-0 text-primary" />Evite promoções com margem abaixo de {MARGEM_MINIMA_PCT}%.</p>
          <p className="flex items-center gap-3"><Boxes className="h-5 w-5 shrink-0 text-primary" />Revise o estoque antes de publicar.</p>
          <p className="flex items-center gap-3"><Building2 className="h-5 w-5 shrink-0 text-primary" />Cada empresa mantém promoções independentes.</p>
        </div>
      </div>
      {novo && <NovaPromocao empresaId={empresa.id} marcas={marcas} onFechar={() => setNovo(false)} onSalvo={() => { setNovo(false); qc.invalidateQueries({ queryKey: ["promocoes"] }); }} />}
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{rotulo}</Label>{children}</div>;
}

function NovaPromocao({ empresaId, marcas, onFechar, onSalvo }: { empresaId: string; marcas: { id: string; nome: string }[]; onFechar: () => void; onSalvo: () => void }) {
  const [modo, setModo] = useState<"produto" | "marca" | "empresa">("produto");
  const [busca, setBusca] = useState("");
  const [produtoId, setProdutoId] = useState<string | null>(null);
  const [marcaId, setMarcaId] = useState("");
  const [nome, setNome] = useState("");
  const [pct, setPct] = useState("10");
  const [inicio, setInicio] = useState(ymdParaBr(hojeSP()));
  const [fim, setFim] = useState("");
  const [salvando, setSalvando] = useState(false);

  const { data: produtos = [] } = useQuery({
    queryKey: ["promo-produtos", empresaId],
    queryFn: async () => {
      const ids = marcas.map((m) => m.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("produtos").select("id, nome, codigo, preco_custo, preco_venda, marca_id, marcas(nome)").in("marca_id", ids).order("nome");
      return (data ?? []) as unknown as Produto[];
    },
  });
  const desconto = Number(pct.replace(",", "."));
  const q = busca.trim().toLowerCase();
  const sugestoes = q ? produtos.filter((p) => p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 8) : [];
  const sel = produtos.find((p) => p.id === produtoId);
  const alvo = modo === "produto" ? (sel ? [sel] : []) : modo === "marca" ? produtos.filter((p) => p.marca_id === marcaId) : produtos;
  const margemSel = sel ? margemPromocional(sel.preco_venda, sel.preco_custo, desconto) : null;

  async function salvar() {
    const di = brParaYmd(inicio), df = brParaYmd(fim);
    if (!(desconto > 0 && desconto < 100)) { toast.error("Desconto deve ser entre 0 e 100%."); return; }
    if (!di || !df) { toast.error("Informe as datas no formato DD/MM."); return; }
    if (df < di) { toast.error("A data final deve ser depois do início."); return; }
    if (!alvo.length) { toast.error("Escolha ao menos um produto."); return; }
    setSalvando(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: emp } = await supabase.from("empresas").select("imposto_pct, custo_fixo_pct, ads_pct").eq("id", empresaId).maybeSingle();
    const { error } = await supabase.from("promocoes").insert(alvo.map((p) => ({ empresa_id: empresaId, produto_id: p.id, nome: nome.trim(), desconto_pct: desconto, data_inicio: di, data_fim: df, created_by: u.user!.id, imposto_pct: emp?.imposto_pct ?? null, custo_fixo_pct: emp?.custo_fixo_pct ?? null, ads_pct: emp?.ads_pct ?? null })));
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success(alvo.length === 1 ? "Promoção criada." : `${alvo.length} promoções criadas.`);
    onSalvo();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova promoção</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">{([["produto", "1 produto"], ["marca", "Marca inteira"], ["empresa", "Empresa inteira"]] as const).map(([v, r]) => (
            <Button key={v} size="sm" variant={modo === v ? "default" : "outline"} onClick={() => setModo(v)}>{r}</Button>))}</div>
          {modo === "produto" && <div className="space-y-1.5">
            <Label>Produto</Label>
            {sel ? <div className="flex items-center justify-between rounded-md border border-border p-2 text-sm"><span>{sel.codigo} · {sel.nome}</span><Button size="sm" variant="ghost" onClick={() => setProdutoId(null)}>Trocar</Button></div>
              : <><Input placeholder="Buscar por nome ou SKU" value={busca} onChange={(e) => setBusca(e.target.value)} />
                {sugestoes.length > 0 && <div className="max-h-48 overflow-y-auto rounded-md border border-border">{sugestoes.map((p) => <button key={p.id} type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => setProdutoId(p.id)}>{p.codigo} · {p.nome}</button>)}</div>}</>}
          </div>}
          {modo === "marca" && <div className="space-y-1.5"><Label>Marca</Label><Select value={marcaId} onValueChange={setMarcaId}><SelectTrigger><SelectValue placeholder="Escolha a marca" /></SelectTrigger><SelectContent>{marcas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></div>}
          {modo !== "produto" && <p className="text-xs text-muted-foreground">Cria uma promoção para cada um dos {alvo.length} produtos.</p>}
          <div className="space-y-1.5"><Label>Nome (opcional)</Label><Input placeholder="Ex.: Black Friday" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Desconto %</Label><Input inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Início</Label><Input placeholder="DD/MM" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Fim</Label><Input placeholder="DD/MM" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
          </div>
          {sel && <div className="rounded-md bg-muted/40 p-3 text-sm">
            <p>Preço: <s className="text-muted-foreground">{brl(sel.preco_venda)}</s> → <b>{brl(precoPromocional(sel.preco_venda, desconto))}</b> · Custo {brl(sel.preco_custo)}</p>
            <p className={COR_MARGEM[nivelMargem(margemSel)]}>Margem: {margemSel == null ? "cadastre custo e venda no Cadastro" : `${margemSel}%`}</p>
          </div>}
        </div>
        <DialogFooter><Button variant="outline" onClick={onFechar}>Cancelar</Button><Button disabled={salvando} onClick={salvar}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
