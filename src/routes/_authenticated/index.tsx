import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ClipboardPlus,
  Home,
  LogOut,
  PackagePlus,
  Settings,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Painel do Grupo — Início" },
      { name: "description", content: "Escolha entre Estoque, Garantia ou Gerenciar no painel do grupo." },
      { property: "og:title", content: "Painel do Grupo — Início" },
      { property: "og:description", content: "Escolha entre Estoque, Garantia ou Gerenciar no painel do grupo." },
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

function Inicio() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <header className="flex h-17 items-center justify-between border-b border-border bg-dashboard-header px-5 sm:px-8">
        <div className="flex items-center gap-4">
          <UserRound className="h-9 w-9 text-foreground" strokeWidth={1.8} aria-hidden="true" />
          <span className="font-display text-base font-semibold text-foreground sm:text-lg">Administrador</span>
        </div>
        <Button variant="ghost" onClick={sair} className="gap-3 text-muted-foreground hover:text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dashboard-avatar text-foreground">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>Sair</span>
          <LogOut className="hidden h-4 w-4 sm:block" aria-hidden="true" />
        </Button>
      </header>

      <div className="grid min-h-[calc(100vh-4.25rem)] md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-dashboard-sidebar p-4 md:flex md:flex-col">
          <div className="flex h-14 items-center gap-4 rounded-md border-l-4 border-dashboard-amber bg-dashboard-nav-active px-4 text-foreground">
            <Home className="h-6 w-6" aria-hidden="true" />
            <span className="font-medium">Início</span>
          </div>
          <div className="mt-auto border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              className="h-12 w-full justify-start gap-4 text-muted-foreground hover:text-foreground"
              aria-label="Configurações (em breve)"
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
              Configurações
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
              <div className="flex min-h-24 items-center gap-5 rounded-md border border-dashboard-red/60 bg-dashboard-red-soft px-5 py-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-dashboard-red-icon text-foreground shadow-dashboard-red">
                  <AlertTriangle className="h-8 w-8" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm text-foreground">Produtos com<br />estoque baixo</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">—</p>
                </div>
              </div>
            </section>

            <section aria-label="Áreas do sistema" className="mt-4 grid gap-4 lg:grid-cols-3">
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
