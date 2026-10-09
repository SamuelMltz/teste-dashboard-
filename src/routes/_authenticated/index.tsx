import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { definirEmpresaAtual, useEmpresaAtual, type EmpresaAtual } from "@/lib/empresa-atual";
import { AvatarEmpresa } from "@/components/AvatarEmpresa";
import { NovaMarcaModal, NovoProdutoModal } from "@/components/CadastroRapido";
import vivalleLogo from "@/assets/logos/vivalle-refined.png";
import luminartechLogo from "@/assets/logos/luminartech-refined.png";
import vitrineLogo from "@/assets/logos/vitrine-refined.png";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ArrowRight,
  ArrowLeftRight,
  Boxes,
  ClipboardPlus,
  Home,
  LogOut,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Tag,
  Truck,
  Menu,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listarEmpresas } from "@/lib/empresas.functions";
import { listarAlertas } from "@/lib/estoque";
import { avaliarPrazoFull } from "@/lib/full-prazos";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const Route = createFileRoute("/_authenticated/")({
  loader: () => listarEmpresas(),
  head: () => ({
    meta: [
      { title: "Painel do Grupo — Início" },
      { name: "description", content: "Acesse Estoque, Garantia, Gerenciar, Full e Pedidos." },
      { property: "og:title", content: "Painel do Grupo — Início" },
      { property: "og:description", content: "Acesse Estoque, Garantia, Gerenciar, Full e Pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Inicio,
});

const OPCOES = [
  { to: "/estoque", titulo: "Estoque", desc: "Consulte marcas e produtos em estoque.", Icon: Boxes, secao: "estoque" },
  { to: "/pedidos", titulo: "Pedidos", desc: "Acompanhe compras e confirme recebimentos.", Icon: PackagePlus, secao: "pedidos" },
  { to: "/full", titulo: "Full", desc: "Prepare produtos e organize os envios.", Icon: Truck, secao: "full" },
] as const;

const GRUPOS_MENU = [
  { titulo: "Acompanhamento", itens: [
    { to: "/graficos", titulo: "Gráficos", Icon: BarChart3, secao: "graficos" },
    { to: "/garantia", titulo: "Garantia/Devolução", Icon: ShieldCheck, secao: "garantia" },
  ] },
  { titulo: "Cadastros", itens: [
    { to: "/admin", titulo: "Gerenciar", Icon: ClipboardPlus, secao: "gerenciar" },
  ] },
] as const;

const LOGOS: Record<string, string> = { vivalle: vivalleLogo, luminartech: luminartechLogo, vitrine: vitrineLogo };

function Inicio() {
  const atual = useEmpresaAtual();
  return atual ? <Painel empresaAtual={atual} /> : <EscolherEmpresa />;
}

function EscolherEmpresa() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["empresas-escolha"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, slug, nome").order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
  function escolher(e: { id: string; slug: string; nome: string }) {
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "empresas-escolha" });
    definirEmpresaAtual(e);
  }
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-estoque-canvas px-5 py-10">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative w-full max-w-5xl text-center">
        <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Escolha a empresa</h1>
        <p className="mt-2 text-muted-foreground">Todo o painel vai funcionar só com os dados da empresa escolhida.</p>
        <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-dashboard-amber" />
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {isLoading ? <p className="text-muted-foreground sm:col-span-3">Carregando empresas…</p> : (data ?? []).map((e) => (
            <button key={e.id} type="button" onClick={() => escolher(e)} className="estoque-card group flex flex-col items-center gap-4 rounded-md border border-border p-8 transition-transform hover:-translate-y-1">
              {LOGOS[e.slug] ? <img src={LOGOS[e.slug]} alt="" className="h-24 w-24 rounded-full object-cover" /> : <span className="flex h-24 w-24 items-center justify-center rounded-full bg-dashboard-avatar font-display text-3xl text-foreground">{e.nome[0]}</span>}
              <span className="font-display text-2xl font-semibold text-foreground">{e.nome}</span>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground">Entrar <ArrowRight className="h-4 w-4" /></span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Painel({ empresaAtual }: { empresaAtual: EmpresaAtual }) {
  const empresas = Route.useLoaderData();
  const carregando = useRouterState({ select: (state) => state.status === "pending" });
  const empresaComDados = empresas.find((e) => e.slug === empresaAtual.slug);
  const quantidadeAlertas = carregando ? "…" : empresaComDados ? listarAlertas([empresaComDados]).length : "—";
  const { user } = Route.useRouteContext();
  const nomeUsuario = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Usuário";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [modal, setModal] = useState<"produto" | "marca" | null>(null);
  const [menuRecolhido, setMenuRecolhido] = useState(false);
  const [menuMobile, setMenuMobile] = useState(false);
  const { data: fullsAgendados = [] } = useQuery({
    queryKey: ["full-prazos", empresaAtual.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("full_cargas").select("id, numero, nome, frete_ml, data_prevista").eq("empresa_id", empresaAtual.id).eq("status", "planejada").not("data_prevista", "is", null).order("data_prevista");
      if (error) throw error;
      return data ?? [];
    },
  });
  const temPrazoCritico = fullsAgendados.some((full) => full.data_prevista && avaliarPrazoFull(full.data_prevista).prazo !== "normal");

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    definirEmpresaAtual(null);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="flex h-17 items-center justify-between gap-2 border-b border-border bg-dashboard-header px-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={() => setMenuMobile((aberto) => !aberto)} aria-label={menuMobile ? "Fechar menu" : "Abrir menu"} aria-expanded={menuMobile} aria-controls="menu-inicial">{menuMobile ? <X /> : <Menu />}</Button>
          <AvatarEmpresa key={empresaAtual.slug} slug={empresaAtual.slug} nome={empresaAtual.nome} />
          <Button variant="outline" size="sm" className="shrink-0 gap-2 px-2 sm:px-3" aria-label="Trocar empresa" title="Trocar empresa" onClick={() => { queryClient.clear(); definirEmpresaAtual(null); }}><ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Trocar empresa</span></Button>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={`relative ${temPrazoCritico ? "text-dashboard-red hover:text-dashboard-red" : "text-muted-foreground hover:text-foreground"}`} aria-label={`${fullsAgendados.length} Fulls agendados`}>
                <Bell className="h-5 w-5" />
                {fullsAgendados.length > 0 && <span className={`absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${temPrazoCritico ? "bg-dashboard-red text-foreground" : "bg-dashboard-amber text-background"}`}>{fullsAgendados.length}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="pointer-events-auto w-80 border-border bg-popover p-0">
              <div className="border-b border-border p-4"><p className="font-display font-semibold text-foreground">Prazos dos Fulls</p><p className="text-xs text-muted-foreground">Datas da empresa {empresaAtual.nome}</p></div>
              <div className="max-h-80 overflow-y-auto p-2">
                {fullsAgendados.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Nenhum Full com data marcada.</p> : fullsAgendados.map((full) => {
                  const prazo = avaliarPrazoFull(full.data_prevista ?? "");
                  return <Link key={full.id} to="/full/$id" params={{ id: full.id }} className={`block rounded-md p-3 hover:bg-accent ${prazo.prazo === "normal" ? "text-foreground" : "bg-dashboard-red-soft text-dashboard-red"}`}><p className="font-medium">#{String(full.numero).padStart(4, "0")} · {full.nome}</p><p className="mt-1 text-xs">{full.frete_ml ? `Frete #${full.frete_ml} · ` : ""}{prazo.rotulo}</p><p className="text-xs text-muted-foreground">{new Date(full.data_prevista ?? "").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p></Link>;
                })}
              </div>
            </PopoverContent>
          </Popover>
          <span className="hidden max-w-32 truncate text-sm text-muted-foreground lg:block">{nomeUsuario}</span>
          <Button variant="ghost" onClick={sair} className="gap-2 px-2 text-muted-foreground hover:text-foreground">
            <span>Sair</span><LogOut className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div
        className={`grid min-h-[calc(100vh-4.25rem)] transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none ${
          menuRecolhido
            ? "md:grid-cols-[68px_minmax(0,1fr)]"
            : "md:grid-cols-[240px_minmax(0,1fr)]"
        }`}
      >
        {menuMobile && <div className="fixed inset-x-0 bottom-0 top-17 z-20 bg-background/80 md:hidden" onClick={() => setMenuMobile(false)} aria-hidden="true" />}
        <aside id="menu-inicial" aria-label="Menu principal"
          className={`fixed bottom-0 left-0 top-17 z-30 w-64 overflow-y-auto border-r border-border bg-dashboard-sidebar py-4 md:static md:flex md:w-auto md:flex-col ${menuMobile ? "flex flex-col" : "hidden"} ${menuRecolhido ? "md:px-2 px-4" : "px-4"}`}
        >
          <div className={`mb-3 hidden md:flex ${menuRecolhido ? "justify-center" : "justify-end"}`}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMenuRecolhido((recolhido) => !recolhido)}
              aria-label={menuRecolhido ? "Expandir menu lateral" : "Recolher menu lateral"}
              title={menuRecolhido ? "Expandir menu lateral" : "Recolher menu lateral"}
              className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            >
              {menuRecolhido ? (
                <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </div>

          <Button asChild variant="ghost" className={`h-13 w-full justify-start border-l-4 border-dashboard-amber bg-dashboard-nav-active text-foreground ${menuRecolhido ? "md:justify-center md:px-0" : "gap-4 px-4"}`}>
            <Link to="/" aria-current="page" title="Início" onClick={() => setMenuMobile(false)}><Home className="h-5 w-5" /><span className={menuRecolhido ? "md:sr-only" : ""}>Início</span></Link>
          </Button>
          <nav className="pb-8" aria-label="Seções">
            {GRUPOS_MENU.map((grupo) => <div key={grupo.titulo} className="mt-7">
              <p className={`mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground ${menuRecolhido ? "md:sr-only" : ""}`}>{grupo.titulo}</p>
              {grupo.itens.map(({ to, titulo, Icon, secao }) => <Button key={to} asChild variant="ghost" data-section={secao} className={`h-12 w-full justify-start gap-3 px-3 text-muted-foreground hover:text-foreground ${menuRecolhido ? "md:justify-center md:px-0" : ""}`}>
                <Link to={to} title={titulo} onClick={() => setMenuMobile(false)}><Icon className="h-5 w-5 text-section" /><span className={menuRecolhido ? "md:sr-only" : ""}>{titulo}</span></Link>
              </Button>)}
            </div>)}
          </nav>
          <div className="mt-auto border-t border-border pt-4">
            <Button
              asChild
              variant="ghost"
              title={menuRecolhido ? "Contas" : undefined}
              className={`h-12 w-full text-muted-foreground hover:text-foreground ${
                menuRecolhido ? "justify-start gap-4 md:justify-center md:px-0" : "justify-start gap-4"
              }`}
            >
              <Link to="/contas">
                <Users className="h-5 w-5" aria-hidden="true" />
                <span className={menuRecolhido ? "md:sr-only" : undefined}>Contas</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              title={menuRecolhido ? "Configurações" : undefined}
              className={`h-12 w-full text-muted-foreground hover:text-foreground ${
                menuRecolhido ? "justify-start gap-4 md:justify-center md:px-0" : "justify-start gap-4"
              }`}
              aria-label="Configurações (em breve)"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              <span className={menuRecolhido ? "md:sr-only" : undefined}>Configurações</span>
            </Button>
          </div>
        </aside>

        <main className="relative min-w-0 px-5 py-7 sm:px-8 lg:px-9 lg:py-8">
          <div className="pointer-events-none absolute inset-0 bg-dashboard-glow" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl">
            <div>
              <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Dashboard</h1>
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">Visão geral do seu sistema</p>
              <div className="mt-3 h-1 w-16 rounded-full bg-dashboard-amber" />
            </div>

            <section aria-label="Resumo" className="mt-5 max-w-md">
              <Link to="/alertas-estoque" className="group flex min-h-24 items-center gap-5 rounded-md border border-dashboard-red/60 bg-dashboard-red-soft px-5 py-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-dashboard-red">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-dashboard-red-icon text-foreground shadow-dashboard-red">
                  <AlertTriangle className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">Produtos com estoque baixo</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{quantidadeAlertas}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-dashboard-red transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </section>

            <section aria-labelledby="operacao-diaria" className="mt-6">
              <h2 id="operacao-diaria" className="mb-3 font-display text-xl font-semibold text-foreground">Operação diária</h2>
              <div className="grid gap-5 lg:grid-cols-3">
              {OPCOES.map(({ to, titulo, desc, Icon, secao }) => {
                return (
                  <Link
                    key={to}
                    data-section={secao}
                    to={to}
                    className={`group relative isolate flex min-h-64 overflow-hidden rounded-md border p-6 xl:min-h-68 xl:p-7 transition-transform duration-300 hover:-translate-y-1 border-section/70 bg-section-soft`}
                  >
                    <div className={`absolute -bottom-24 -right-16 h-48 w-48 rounded-full opacity-70 transition-transform duration-500 group-hover:scale-110 bg-section-wave`} aria-hidden="true" />
                    <div className="relative z-10 flex w-full flex-col items-start">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-md section-icon`}>
                        <Icon className="h-8 w-8" aria-hidden="true" />
                      </div>
                      <h2 className="mt-4 max-w-full font-display text-2xl font-semibold text-foreground">{titulo === "Garantia/Devolução" ? <>Garantia/<wbr />Devolução</> : titulo}</h2>
                      <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">{desc}</p>
                      <span className="mt-5 inline-flex h-10 items-center gap-5 rounded-md border border-section/70 bg-section-icon/40 px-4 text-sm font-medium text-foreground">Acessar<ArrowRight className="h-4 w-4 text-section transition-transform group-hover:translate-x-1" aria-hidden="true" /></span>
                    </div>
                  </Link>
                );
              })}
              </div>
            </section>

            <section data-section="gerenciar" aria-labelledby="acoes-rapidas" className="mt-5 border-t border-border pt-4">
              <h2 id="acoes-rapidas" className="font-display text-lg font-semibold text-foreground">Ações rápidas</h2>
              <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-15 justify-start gap-4 border-dashboard-green/50 bg-dashboard-green-soft px-4 hover:bg-dashboard-green-soft"
                  onClick={() => setModal("produto")}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-dashboard-green-icon text-foreground">
                    <PackagePlus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  Novo produto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-15 justify-start gap-4 border-dashboard-green/50 bg-dashboard-green-soft px-4 hover:bg-dashboard-green-soft"
                  onClick={() => setModal("marca")}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-dashboard-green-icon text-foreground">
                    <Tag className="h-5 w-5" aria-hidden="true" />
                  </span>
                  Nova marca
                </Button>
              </div>
              <NovoProdutoModal empresa={empresaAtual} aberto={modal === "produto"} onFechar={() => setModal(null)} onNovaMarca={() => setModal("marca")} />
              <NovaMarcaModal empresa={empresaAtual} aberto={modal === "marca"} onFechar={() => setModal(null)} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
