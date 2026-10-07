import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { definirEmpresaAtual, useEmpresaAtual } from "@/lib/empresa-atual";
import vivalleLogo from "@/assets/logos/vivalle-refined.png";
import luminartechLogo from "@/assets/logos/luminartech-refined.png";
import vitrineLogo from "@/assets/logos/vitrine-refined.png";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
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
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { listarEmpresas } from "@/lib/empresas.functions";
import { listarAlertas } from "@/lib/estoque";

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
  {
    to: "/estoque",
    titulo: "Estoque",
    desc: "Veja as marcas e produtos em estoque.",
    Icon: Boxes,
    cor: "amber",
  },
  {
    to: "/garantia",
    titulo: "Garantia",
    desc: "Acompanhe as garantias dos produtos.",
    Icon: ShieldCheck,
    cor: "blue",
  },
  {
    to: "/admin",
    titulo: "Gerenciar",
    desc: "Cadastre e organize marcas e produtos.",
    Icon: ClipboardPlus,
    cor: "green",
  },
  {
    to: "/full",
    titulo: "Full",
    desc: "Planeje cargas e confirme a baixa no estoque.",
    Icon: Truck,
    cor: "amber",
  },
  {
    to: "/pedidos",
    titulo: "Pedidos",
    desc: "Monte pedidos e confirme a entrada no estoque.",
    Icon: PackagePlus,
    cor: "green",
  },
] as const;

const CORES = {
  amber: {
    card: "border-dashboard-amber/70 bg-dashboard-amber-soft",
    icon: "bg-dashboard-amber-icon text-foreground shadow-dashboard-amber",
    arrow: "bg-dashboard-amber-icon text-foreground",
    wave: "bg-dashboard-amber-wave",
  },
  blue: {
    card: "border-dashboard-blue/70 bg-dashboard-blue-soft",
    icon: "bg-dashboard-blue-icon text-foreground shadow-dashboard-blue",
    arrow: "bg-dashboard-blue-icon text-foreground",
    wave: "bg-dashboard-blue-wave",
  },
  green: {
    card: "border-dashboard-green/70 bg-dashboard-green-soft",
    icon: "bg-dashboard-green-icon text-foreground shadow-dashboard-green",
    arrow: "bg-dashboard-green-icon text-foreground",
    wave: "bg-dashboard-green-wave",
  },
} as const;

const LOGOS: Record<string, string> = { vivalle: vivalleLogo, luminartech: luminartechLogo, vitrine: vitrineLogo };

function Inicio() {
  const atual = useEmpresaAtual();
  return atual ? <Painel /> : <EscolherEmpresa />;
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

function Painel() {
  const empresaAtual = useEmpresaAtual()!;
  const empresas = Route.useLoaderData();
  const alertas = listarAlertas(empresas.filter((e) => e.slug === empresaAtual.slug));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuRecolhido, setMenuRecolhido] = useState(false);

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    definirEmpresaAtual(null);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="flex h-17 items-center justify-between border-b border-border bg-dashboard-header px-5 sm:px-8">
        <div className="flex items-center gap-4">
          <UserRound className="h-9 w-9 text-foreground" strokeWidth={1.8} aria-hidden="true" />
          <span className="font-display text-base font-semibold text-foreground sm:text-lg">{empresaAtual.nome}</span>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { queryClient.clear(); definirEmpresaAtual(null); }}><ArrowLeftRight className="h-4 w-4" />Trocar empresa</Button>
        </div>
        <Button variant="ghost" onClick={sair} className="gap-3 text-muted-foreground hover:text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dashboard-avatar text-foreground">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>Sair</span>
          <LogOut className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        </Button>
      </header>

      <div
        className={`grid min-h-[calc(100vh-4.25rem)] transition-[grid-template-columns] duration-300 ease-out ${
          menuRecolhido
            ? "md:grid-cols-[68px_minmax(0,1fr)]"
            : "md:grid-cols-[220px_minmax(0,1fr)]"
        }`}
      >
        <aside
          className={`hidden overflow-hidden border-r border-border bg-dashboard-sidebar py-4 transition-[padding] duration-300 md:flex md:flex-col ${
            menuRecolhido ? "px-2" : "px-4"
          }`}
        >
          <div className={`mb-3 flex ${menuRecolhido ? "justify-center" : "justify-end"}`}>
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

          <div
            title={menuRecolhido ? "Início" : undefined}
            className={`flex h-14 items-center rounded-md border-l-4 border-dashboard-amber bg-dashboard-nav-active text-foreground ${
              menuRecolhido ? "justify-center px-2" : "gap-4 px-4"
            }`}
          >
            <Home className="h-6 w-6" aria-hidden="true" />
            <span className={menuRecolhido ? "sr-only" : "font-medium"}>Início</span>
          </div>
          <div className="mt-auto border-t border-border pt-4">
            <Button
              asChild
              variant="ghost"
              title={menuRecolhido ? "Contas" : undefined}
              className={`h-12 w-full text-muted-foreground hover:text-foreground ${
                menuRecolhido ? "justify-center px-0" : "justify-start gap-4"
              }`}
            >
              <Link to="/contas">
                <Users className="h-5 w-5" aria-hidden="true" />
                <span className={menuRecolhido ? "sr-only" : undefined}>Contas</span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              title={menuRecolhido ? "Configurações" : undefined}
              className={`h-12 w-full text-muted-foreground hover:text-foreground ${
                menuRecolhido ? "justify-center px-0" : "justify-start gap-4"
              }`}
              aria-label="Configurações (em breve)"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              <span className={menuRecolhido ? "sr-only" : undefined}>Configurações</span>
            </Button>
          </div>
        </aside>

        <main className="relative px-5 py-9 sm:px-8 lg:px-11 lg:py-11">
          <div className="pointer-events-none absolute inset-0 bg-dashboard-glow" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl">
            <div>
              <h1 className="font-display text-5xl font-bold text-foreground sm:text-6xl">Dashboard</h1>
              <p className="mt-1 text-base text-muted-foreground sm:text-lg">Visão geral do seu sistema</p>
              <div className="mt-3 h-1 w-16 rounded-full bg-dashboard-amber" />
            </div>

            <section aria-label="Resumo" className="mt-5 max-w-sm">
              <Link to="/alertas-estoque" className="group flex min-h-24 items-center gap-5 rounded-md border border-dashboard-red/60 bg-dashboard-red-soft px-5 py-4 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-dashboard-red">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-dashboard-red-icon text-foreground shadow-dashboard-red">
                  <AlertTriangle className="h-8 w-8" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">Produtos com<br />estoque baixo</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">{alertas.length}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-dashboard-red transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </section>

            <section aria-label="Áreas do sistema" className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {OPCOES.map(({ to, titulo, desc, Icon, cor }) => {
                const cores = CORES[cor];
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`group relative isolate flex min-h-60 overflow-hidden rounded-md border p-6 transition-transform duration-300 hover:-translate-y-1 ${cores.card}`}
                  >
                    <div className={`absolute -bottom-16 -right-10 h-32 w-4/5 rotate-[-18deg] rounded-[50%] opacity-70 transition-transform duration-500 group-hover:scale-110 ${cores.wave}`} aria-hidden="true" />
                    <div className="relative z-10 flex w-full flex-col items-start">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-md ${cores.icon}`}>
                        <Icon className="h-8 w-8" aria-hidden="true" />
                      </div>
                      <h2 className="mt-4 font-display text-2xl font-semibold text-foreground">{titulo}</h2>
                      <p className="mt-1 max-w-56 text-sm leading-6 text-muted-foreground">{desc}</p>
                      <span className={`mt-auto flex h-10 w-10 items-center justify-center rounded-full transition-transform group-hover:translate-x-1 ${cores.arrow}`}>
                        <ArrowRight className="h-5 w-5" aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </section>

            <section aria-labelledby="acoes-rapidas" className="mt-5 border-t border-border pt-4">
              <h2 id="acoes-rapidas" className="font-display text-lg font-semibold text-foreground">Ações rápidas</h2>
              <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-15 justify-start gap-4 border-dashboard-amber/50 bg-dashboard-amber-soft px-4 hover:bg-dashboard-amber-soft"
                  aria-label="Novo produto (em breve)"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-dashboard-amber-icon text-foreground">
                    <PackagePlus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  Novo produto
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-15 justify-start gap-4 border-dashboard-green/50 bg-dashboard-green-soft px-4 hover:bg-dashboard-green-soft"
                  aria-label="Nova marca (em breve)"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-dashboard-green-icon text-foreground">
                    <Tag className="h-5 w-5" aria-hidden="true" />
                  </span>
                  Nova marca
                </Button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
