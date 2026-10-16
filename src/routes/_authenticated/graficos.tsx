import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { hojeSP, ymdParaInstanteSP } from "@/lib/datas";
import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, CalendarDays, FileText, Package, PieChart as PizzaIcon, Search, ShoppingCart, Tag } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReposicaoFisica } from "@/components/ReposicaoFisica";
import { SincronizarMl } from "@/components/SincronizarMl";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listarEmpresas } from "@/lib/empresas.functions";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";
import { BarraEmpresa } from "@/components/BarraEmpresa";
import { prepararFatias, type EstoquePizza } from "@/lib/graficos";
import { classificarReposicao, sugerirReposicao, type SituacaoReposicao } from "@/lib/reposicao";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip as Dica, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated/graficos")({
  loader: () => listarEmpresas(),
  head: () => ({
    meta: [
      { title: "Gráficos — Estoque Full e reposição" },
      { name: "description", content: "Compare o estoque Full com o físico e acompanhe a reposição." },
      { property: "og:title", content: "Gráficos — Estoque Full e reposição" },
      { property: "og:description", content: "Compare o estoque Full com o físico e acompanhe a reposição." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Graficos,
});

type Linha = { sku: string; cod: string; nome: string; marca: string; marcaNome?: string; fisico: number; full: number | null; vendas: number | null };


const COR = { full: "var(--graficos-full)", fisico: "var(--graficos-fisico)", vendas: "var(--graficos-vendas)" };
const FILTROS = [["todos", "Todos"], ["abaixo", "Abaixo"], ["proximo", "Próximos"]] as const;

/** Formato de exibição dos painéis: barras (padrão) ou pizza. */
const TIPOS = [["barras", "Barras", BarChart3], ["pizza", "Pizza", PizzaIcon]] as const;
type TipoGrafico = (typeof TIPOS)[number][0];

function Graficos() {
  const empresas = Route.useLoaderData();
  const global = useEmpresaObrigatoria();
  const slugAtivo = global?.slug ?? "";
  const empresa = empresas.find((e) => e.slug === slugAtivo);
  const [marca, setMarca] = useState("todas");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][0]>("todos");
  const [tipo, setTipo] = useState<TipoGrafico>("barras");
  const [estoquePizza, setEstoquePizza] = useState<EstoquePizza>("fisico");

  const { data: fullMl } = useQuery({
    queryKey: ["ml-estoque", empresa?.id],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ml_estoque_full").select("sku, quantidade").eq("empresa_id", empresa!.id);
      const m = new Map<string, number>();
      for (const r of data ?? []) { const k = String(r.sku).trim().toUpperCase(); if (k) m.set(k, (m.get(k) ?? 0) + r.quantidade); }
      return m;
    },
  });
  const { data: vendasMl } = useQuery({
    queryKey: ["ml-estoque", empresa?.id, "vendas"],
    enabled: !!empresa?.id,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ml_vendas").select("sku, unidades").eq("empresa_id", empresa!.id);
      const m = new Map<string, number>();
      for (const r of data ?? []) m.set(String(r.sku).trim().toUpperCase(), r.unidades);
      return m;
    },
  });
  const linhasReais: Linha[] = useMemo(() => (empresa?.marcas ?? []).flatMap((m) =>
    m.produtos.map((p) => {
      const k = p.codigo.trim().toUpperCase();
      return { sku: p.codigo, cod: p.cod, nome: p.nome, marca: m.slug, marcaNome: m.nome, fisico: p.estoque, full: fullMl?.size ? (fullMl.get(k) ?? 0) : null, vendas: vendasMl?.size ? (vendasMl.get(k) ?? 0) : null };
    })), [empresa, fullMl, vendasMl]);

  const termo = busca.trim().toLowerCase();
  const base = linhasReais.filter((l) =>
    (marca === "todas" || l.marca === marca) &&
    (!termo || [l.nome, l.sku, l.cod].some((v) => v.toLowerCase().includes(termo))));
  const linhas = base.map((l) => ({ ...l, situacao: classificarReposicao(l.full, l.vendas), sugestao: sugerirReposicao(l.full, l.fisico, l.vendas) }));
  const visiveis = filtro === "todos" ? linhas : linhas.filter((l) => l.situacao === filtro);
  const comFull = linhas.filter((l) => l.full !== null);
  const comVendas = linhas.filter((l) => l.full !== null && l.vendas !== null && (l.vendas > 0 || (l.full ?? 0) > 0));
  const navigate = useNavigate();
  const [gerando, setGerando] = useState(false);

  async function gerar(tipoDoc: "full" | "pedido") {
    if (!empresa?.id || gerando) return;
    const campo = tipoDoc === "full" ? "enviar" : "comprar";
    const escolhidos = linhas.filter((l) => (l.sugestao?.[campo] ?? 0) > 0 && l.sku.trim());
    if (!escolhidos.length) { toast.info(tipoDoc === "full" ? "Nenhum produto precisa ser enviado ao Full." : "Nenhum produto precisa ser comprado."); return; }
    if (!confirm(`Criar ${tipoDoc === "full" ? "um Full" : "um rascunho de pedido"} com ${escolhidos.length} produto(s)? O estoque não muda agora.`)) return;
    setGerando(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sua sessão expirou.");
      const { data: prods, error: ep } = await supabase.from("produtos").select("id, codigo, marcas!inner(empresa_id)").eq("marcas.empresa_id", empresa.id);
      if (ep) throw ep;
      const ids = new Map((prods ?? []).map((p) => [p.codigo.trim().toUpperCase(), p.id]));
      const itens = escolhidos.map((l) => ({ produto_id: ids.get(l.sku.trim().toUpperCase()), quantidade: l.sugestao![campo] })).filter((i) => i.produto_id) as { produto_id: string; quantidade: number }[];
      const hoje = hojeSP();
      if (tipoDoc === "full") {
        const { data: c, error } = await supabase.from("full_cargas").insert({ nome: "Full gerado pelos gráficos", empresa_id: empresa.id, created_by: u.user.id, data_prevista: ymdParaInstanteSP(hoje) }).select("id").single();
        if (error) throw error;
        const { error: ei } = await supabase.from("full_itens").insert(itens.map((i) => ({ ...i, carga_id: c.id })));
        if (ei) throw ei;
        navigate({ to: "/full/$id", params: { id: c.id } });
      } else {
        const { data: emp } = await supabase.from("empresas").select("endereco").eq("id", empresa.id).maybeSingle();
        const { data: p, error } = await supabase.from("pedidos").insert({ nome: "Pedido gerado pelos gráficos", fornecedor: empresa.nome, empresa_id: empresa.id, created_by: u.user.id, data_pedido: hoje, endereco_entrega: emp?.endereco ?? "", rascunho: true }).select("id").single();
        if (error) throw error;
        const { error: ei } = await supabase.from("pedido_itens").insert(itens.map((i) => ({ ...i, pedido_id: p.id })));
        if (ei) throw ei;
        navigate({ to: "/pedidos/$id", params: { id: p.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar.");
    } finally { setGerando(false); }
  }

  return (
    <div className="relative min-h-screen bg-estoque-canvas px-5 py-8 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar ao início</Link>
          <BarraEmpresa />
        </div>

        <header className="mt-6 flex flex-col gap-5 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-md section-icon"><BarChart3 className="h-8 w-8" /></div>
              <div className="mt-2 h-1 w-16 rounded-full bg-section" />
            </div>
            <div>
              <h1 className="font-display text-5xl font-bold text-foreground">Gráficos</h1>
              <p className="mt-1 text-lg text-muted-foreground">Compare o estoque e acompanhe a reposição do Full.</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            {empresa?.id && <SincronizarMl empresaId={empresa.id} />}
          </div>
        </header>

        <div className="mt-5 grid gap-3 md:grid-cols-[14rem_14rem_1fr]">
          <div className="flex h-11 items-center gap-2 rounded-md border border-input px-3 text-sm text-foreground"><CalendarDays className="h-4 w-4 text-section" />Vendas: últimos 30 dias</div>
          <Select value={marca} onValueChange={setMarca}>
            <SelectTrigger className="h-11 gap-2"><Tag className="h-4 w-4 text-section" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todas as marcas</SelectItem>{(empresa?.marcas ?? []).map((m) => <SelectItem key={m.slug} value={m.slug}>{m.nome}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-section" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por produto, COD ou SKU" className="h-11 pl-10" /></div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Formato do gráfico">
          {TIPOS.map(([v, r, I]) => (
            <Button key={v} variant="outline" size="sm" onClick={() => setTipo(v)} aria-pressed={tipo === v} className={tipo === v ? "border-section bg-section/20 font-semibold text-section" : ""}><I className="h-4 w-4" />{r}</Button>
          ))}
        </div>

        {tipo === "pizza" ? (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Estoque do gráfico de pizza">
              {([["fisico", "Estoque físico"], ["full", "Estoque Full"], ["ambos", "Ambos"]] as const).map(([v, r]) => (
                <Button key={v} variant="outline" size="sm" onClick={() => setEstoquePizza(v)} aria-pressed={estoquePizza === v} className={estoquePizza === v ? "border-section bg-section/20 font-semibold text-section" : ""}>{r}</Button>
              ))}
            </div>
            <Painel titulo="Estoque por marca" sub={estoquePizza === "fisico" ? "Estoque físico" : estoquePizza === "full" ? "Estoque Full" : "Estoque físico + Full"} legenda={[]}>
              <GraficoPizza dados={base} estoque={estoquePizza} cor={estoquePizza === "full" ? COR.full : COR.fisico} />
            </Painel>
          </div>
        ) : <div className="mt-4 grid gap-5 lg:grid-cols-[3fr_2fr]">
          <Painel titulo="Estoque Full × estoque físico" sub="Compare as quantidades por produto" legenda={[["Full", COR.full], ["Físico", COR.fisico]]}>
            {comFull.length === 0 ? <Vazio texto="Aguardando dados de estoque do Full" /> : (
              <Grafico dados={comFull} series={[["full", COR.full, "Full"], ["fisico", COR.fisico, "Físico"]]} />
            )}
          </Painel>
          <Painel titulo="Vendas × estoque Full" sub="Referência para cobertura de 30 dias" legenda={[["Vendas em 30 dias", COR.vendas], ["Full disponível", COR.full]]}>
            {comVendas.length === 0 ? <Vazio texto="Aguardando dados de vendas" /> : (
              <Grafico dados={comVendas} series={[["vendas", COR.vendas, "Vendas"], ["full", COR.full, "Full"]]} />
            )}
          </Painel>
        </div>}

        <section className="estoque-card mt-5 rounded-md border border-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-display text-2xl font-semibold text-foreground">Produtos para reposição</h2><p className="text-section">Itens com estoque Full abaixo ou próximo das vendas do período.</p></div>
            <div className="flex gap-2">{FILTROS.map(([v, r]) => (
              <Button key={v} variant="outline" size="sm" onClick={() => setFiltro(v)} aria-pressed={filtro === v} className={filtro === v ? "border-section bg-section/20 font-semibold text-section" : ""}>{r}</Button>
            ))}</div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>{["SKU", "Produto", "Full", "Físico", "Vendas 30 dias", "A enviar", "A comprar"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
              </thead>
              <tbody>
                {visiveis.length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-muted-foreground"><Package className="mx-auto mb-2 h-8 w-8 text-section" />{linhas.length === 0 ? "Nenhum produto encontrado." : "Os produtos aparecerão após a sincronização."}</td></tr>
                ) : visiveis.map((l) => (
                  <tr key={l.sku + l.nome} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{l.sku || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{l.nome}</td>
                    <td className="px-4 py-3"><CelulaFull valor={l.full} situacao={l.situacao} /></td>
                    <td className="px-4 py-3 text-foreground">{l.fisico}</td>
                    <td className="px-4 py-3 text-muted-foreground">{l.vendas === null || l.vendas <= 0 ? "Sem referência de vendas" : l.vendas}</td>
                    <td className="px-4 py-3 text-foreground">{l.sugestao?.enviar ?? "—"}</td>
                    <td className="px-4 py-3 text-foreground">{l.sugestao?.comprar ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs italic text-muted-foreground">Estoque físico e estoque Full são acompanhados separadamente.</p>
            <TooltipProvider>
              <div className="flex gap-3">
                <Dica><TooltipTrigger asChild><span tabIndex={0}><Button disabled={gerando} onClick={() => gerar("full")} variant="outline" className="h-11 gap-2 border-section/60 text-section"><FileText className="h-4 w-4" />Gerar Full</Button></span></TooltipTrigger><TooltipContent>Cria um Full com as quantidades da coluna "A enviar".</TooltipContent></Dica>
                <Dica><TooltipTrigger asChild><span tabIndex={0}><Button disabled={gerando} onClick={() => gerar("pedido")} variant="outline" className="h-11 gap-2 border-section/60 text-section"><ShoppingCart className="h-4 w-4" />Criar pedido</Button></span></TooltipTrigger><TooltipContent>Cria um rascunho de pedido com a coluna "A comprar".</TooltipContent></Dica>
              </div>
            </TooltipProvider>
          </div>
        </section>

        {slugAtivo && <ReposicaoFisica empresaSlug={slugAtivo} titulo="Reposição do estoque físico" />}
      </div>
    </div>
  );
}

function CelulaFull({ valor, situacao }: { valor: number | null; situacao: SituacaoReposicao }) {
  if (valor === null) return <span className="text-muted-foreground">—</span>;
  const cls = situacao === "abaixo" ? "bg-dashboard-red-soft text-dashboard-red" : situacao === "proximo" ? "bg-dashboard-amber-soft text-dashboard-amber" : "text-foreground";
  return <span className={`inline-block min-w-14 rounded px-3 py-1 text-center font-semibold ${cls}`}>{valor}</span>;
}

function Painel({ titulo, sub, legenda, children }: { titulo: string; sub: string; legenda: [string, string][]; children: React.ReactNode }) {
  return (
    <section className="estoque-card rounded-md border border-border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="font-display text-xl font-semibold text-foreground">{titulo}</h2><p className="text-sm text-muted-foreground">{sub}</p></div>
        <div className="flex gap-4 text-xs text-muted-foreground">{legenda.map(([r, c]) => <span key={r} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{r}</span>)}</div>
      </div>
      <div className="mt-4 h-64">{children}</div>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded border border-dashed border-border text-sm text-muted-foreground">
      <BarChart3 className="h-10 w-10 text-section" />{texto}
    </div>
  );
}

function Grafico({ dados, series }: { dados: Linha[]; series: [keyof Linha, string, string][] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} margin={{ top: 20, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="sku" stroke="var(--muted-foreground)" fontSize={12} />
        <YAxis stroke="var(--muted-foreground)" fontSize={12} />
        <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", color: "var(--foreground)" }} />
        {series.map(([k, c, n]) => (
          <Bar key={k} dataKey={k} name={n} fill={c} radius={[4, 4, 0, 0]}><LabelList dataKey={k} position="top" fill="var(--foreground)" fontSize={12} /></Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Fatias vão ficando mais claras conforme a posição, sempre na cor da série. */
function opacidadeFatia(i: number, total: number) {
  return total <= 1 ? 1 : 1 - (i * 0.6) / (total - 1);
}

function GraficoPizza({ dados, estoque, cor }: { dados: Linha[]; estoque: EstoquePizza; cor: string }) {
  const { fatias, total } = prepararFatias(dados, estoque);
  if (fatias.length === 0) return <Vazio texto="Sem dados de estoque para os filtros selecionados" />;
  return (
    <div className="flex h-full items-center gap-4">
      <div className="relative h-full min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={fatias} dataKey="valor" nameKey="nome" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="var(--background)" strokeWidth={2} isAnimationActive={false}>
              {fatias.map((f, i) => <Cell key={`${f.nome}-${i}`} fill={cor} fillOpacity={opacidadeFatia(i, fatias.length)} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              const fatia = payload?.[0]?.payload;
              if (!active || !fatia) return null;
              return <div className="rounded-md border border-border bg-popover p-3 text-sm text-popover-foreground"><p className="font-semibold">{fatia.nome}</p><p>{fatia.valor.toLocaleString("pt-BR")} unidades · {fatia.percentual.toLocaleString("pt-BR")}%</p></div>;
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold text-foreground">{total}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Unidades</span>
        </div>
      </div>
      <ul className="max-h-full w-36 shrink-0 space-y-1 overflow-y-auto pr-1 text-xs sm:w-64">
        {fatias.map((f, i) => (
          <li key={`legenda-${f.nome}-${i}`} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: cor, opacity: opacidadeFatia(i, fatias.length) }} />
            <span className="truncate text-foreground" title={f.nome}>{f.nome}</span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">{f.valor.toLocaleString("pt-BR")} · {f.percentual.toLocaleString("pt-BR")}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
