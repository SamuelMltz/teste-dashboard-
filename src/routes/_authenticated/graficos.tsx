import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Building2, CalendarDays, FileText, Package, Search, ShoppingCart, Tag } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ReposicaoFisica } from "@/components/ReposicaoFisica";
import { listarEmpresas } from "@/lib/empresas.functions";
import { useEmpresaAtual } from "@/lib/empresa-atual";
import { classificarReposicao, sugerirReposicao, type SituacaoReposicao } from "@/lib/reposicao";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

type Linha = { sku: string; cod: string; nome: string; marca: string; fisico: number; full: number | null; vendas: number | null };

/** Somente para o modo demonstração — nunca misturado com os registros reais. */
const DEMO: Linha[] = [
  { sku: "G024", cod: "", nome: "Fita LED 12V", marca: "Demonstração", fisico: 50, full: 30, vendas: 100 },
  { sku: "G007", cod: "", nome: "Fonte 12V", marca: "Demonstração", fisico: 80, full: 40, vendas: 90 },
  { sku: "G027", cod: "", nome: "Fita LED IP65", marca: "Demonstração", fisico: 15, full: 20, vendas: 60 },
];

const COR = { full: "var(--graficos-full)", fisico: "var(--graficos-fisico)", vendas: "var(--graficos-vendas)" };
const FILTROS = [["todos", "Todos"], ["abaixo", "Abaixo"], ["proximo", "Próximos"]] as const;

function Graficos() {
  const empresas = Route.useLoaderData();
  const global = useEmpresaAtual();
  // Estado local: não altera a empresa global do sistema.
  const [slug, setSlug] = useState<string | null>(null);
  const slugAtivo = slug ?? global?.slug ?? empresas[0]?.slug ?? "";
  const empresa = empresas.find((e) => e.slug === slugAtivo);
  const [periodo, setPeriodo] = useState("30");
  const [marca, setMarca] = useState("todas");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number][0]>("todos");
  const [demo, setDemo] = useState(false);

  const linhasReais: Linha[] = useMemo(() => (empresa?.marcas ?? []).flatMap((m) =>
    m.produtos.map((p) => ({ sku: p.codigo, cod: p.cod, nome: p.nome, marca: m.slug, fisico: p.estoque, full: null, vendas: null }))), [empresa]);

  const termo = busca.trim().toLowerCase();
  const base = (demo ? DEMO : linhasReais).filter((l) =>
    (demo || marca === "todas" || l.marca === marca) &&
    (!termo || [l.nome, l.sku, l.cod].some((v) => v.toLowerCase().includes(termo))));
  const linhas = base.map((l) => ({ ...l, situacao: classificarReposicao(l.full, l.vendas), sugestao: sugerirReposicao(l.full, l.fisico, l.vendas) }));
  const visiveis = filtro === "todos" ? linhas : linhas.filter((l) => l.situacao === filtro);
  const comFull = linhas.filter((l) => l.full !== null);
  const comVendas = linhas.filter((l) => l.full !== null && l.vendas !== null);

  function trocarEmpresa(s: string) { setSlug(s); setMarca("todas"); }

  return (
    <div className="relative min-h-screen bg-estoque-canvas px-5 py-8 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar ao início</Link>

        <header className="mt-6 flex flex-col gap-5 border-b border-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-5">
            <div>
              <div className="flex h-16 w-16 items-center justify-center rounded-md section-icon"><BarChart3 className="h-8 w-8" /></div>
              <div className="mt-2 h-1 w-16 rounded-full bg-section" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-5xl font-bold text-foreground">Gráficos</h1>
                {demo && <span className="rounded-full border border-section px-4 py-1 text-xs font-semibold uppercase tracking-wide text-section">Dados fictícios — demonstração</span>}
              </div>
              <p className="mt-1 text-lg text-muted-foreground">Compare o estoque e acompanhe a reposição do Full.</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <Select value={slugAtivo} onValueChange={trocarEmpresa}>
              <SelectTrigger className="h-12 w-64 gap-2" aria-label="Empresa visualizada"><Building2 className="h-5 w-5 text-section" /><SelectValue /></SelectTrigger>
              <SelectContent>{empresas.map((e) => <SelectItem key={e.slug} value={e.slug}>{e.nome}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">Atualização: Ainda não sincronizado</p>
            <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={demo} onCheckedChange={setDemo} />Modo demonstração</label>
          </div>
        </header>

        <div className="mt-5 grid gap-3 md:grid-cols-[14rem_14rem_1fr]">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="h-11 gap-2"><CalendarDays className="h-4 w-4 text-section" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="7">Últimos 7 dias</SelectItem><SelectItem value="30">Últimos 30 dias</SelectItem><SelectItem value="90">Últimos 90 dias</SelectItem></SelectContent>
          </Select>
          <Select value={marca} onValueChange={setMarca} disabled={demo}>
            <SelectTrigger className="h-11 gap-2"><Tag className="h-4 w-4 text-section" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="todas">Todas as marcas</SelectItem>{(empresa?.marcas ?? []).map((m) => <SelectItem key={m.slug} value={m.slug}>{m.nome}</SelectItem>)}</SelectContent>
          </Select>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-section" /><Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por produto, COD ou SKU" className="h-11 pl-10" /></div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[3fr_2fr]">
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
        </div>

        <section className="estoque-card mt-5 rounded-md border border-border p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-display text-2xl font-semibold text-foreground">Produtos para reposição</h2><p className="text-section">Itens com estoque Full abaixo ou próximo das vendas do período.</p></div>
            <div className="flex gap-2">{FILTROS.map(([v, r]) => (
              <Button key={v} variant="outline" size="sm" onClick={() => setFiltro(v)} aria-pressed={filtro === v} className={filtro === v ? "border-section bg-section-soft text-section" : ""}>{r}</Button>
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
            <p className="text-xs italic text-muted-foreground">{demo ? "Dados ilustrativos. " : ""}Estoque físico e estoque Full são acompanhados separadamente.</p>
            <TooltipProvider>
              <div className="flex gap-3">
                {([["Gerar Full", FileText], ["Criar pedido", ShoppingCart]] as const).map(([r, I]) => (
                  <Dica key={r}><TooltipTrigger asChild><span tabIndex={0}><Button disabled variant="outline" className="h-11 gap-2"><I className="h-4 w-4" />{r}</Button></span></TooltipTrigger><TooltipContent>Disponível após a integração com o Mercado Livre.</TooltipContent></Dica>
                ))}
              </div>
            </TooltipProvider>
          </div>
          <p className="mt-2 text-right text-xs text-muted-foreground">Disponível após a integração com o Mercado Livre.</p>
        </section>

        {!demo && slugAtivo && <ReposicaoFisica empresaSlug={slugAtivo} titulo="Reposição do estoque físico" />}
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
