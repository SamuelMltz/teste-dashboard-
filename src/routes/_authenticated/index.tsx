import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boxes, ShieldCheck, Settings, ArrowUpRight } from "lucide-react";

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
  { to: "/estoque", titulo: "Estoque", desc: "Veja as empresas, marcas e produtos em estoque.", Icon: Boxes },
  { to: "/garantia", titulo: "Garantia", desc: "Acompanhe as garantias.", Icon: ShieldCheck },
  { to: "/admin", titulo: "Gerenciar", desc: "Cadastre e organize marcas e produtos.", Icon: Settings },
] as const;

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="relative mb-12">
          <button
            onClick={sair}
            className="absolute right-0 top-0 rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            Sair
          </button>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Painel corporativo</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            O que você quer fazer?
          </h1>
        </header>
        <div className="grid gap-6 md:grid-cols-3">
          {OPCOES.map(({ to, titulo, desc, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/30"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
              </div>
              <h2 className="mt-6 font-display text-2xl font-semibold text-foreground">{titulo}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
