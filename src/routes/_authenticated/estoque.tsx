import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight } from "lucide-react";

import { listarEmpresas } from "@/lib/empresas.functions";

export const Route = createFileRoute("/_authenticated/estoque")({
  loader: () => listarEmpresas(),
  head: () => ({
    meta: [
      { title: "Estoque — Empresas do Grupo" },
      {
        name: "description",
        content:
          "Painel corporativo com a visão geral das empresas do grupo: Vivalle, Luminartech e Vitrine.",
      },
      { property: "og:title", content: "Estoque — Empresas do Grupo" },
      {
        property: "og:description",
        content:
          "Painel corporativo com a visão geral das empresas do grupo: Vivalle, Luminartech e Vitrine.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const EMPRESAS = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const admin = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

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
          <div className="absolute right-0 top-0 flex items-center gap-2">
            <Link to="/" className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              Voltar ao início
            </Link>
            <button
              onClick={sair}
              className="rounded-full px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              Sair
            </button>
          </div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Painel corporativo
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Selecione uma empresa
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Toque em um dos cartões abaixo para abrir a visão detalhada de cada
            unidade de negócio.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {EMPRESAS.map((empresa) => {
            return (
              <Link
                key={empresa.slug}
                to="/empresa/$slug"
                params={{ slug: empresa.slug }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-transparent"
                style={{ ["--empresa-accent" as string]: empresa.accent }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-80"
                  style={{ backgroundColor: empresa.accent }}
                />
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-[0.18]"
                  style={{ backgroundColor: empresa.accent }}
                />

                <div className="flex items-start justify-between">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl font-display text-xl font-bold"
                    style={{
                      backgroundColor: `${empresa.accent}1a`,
                      color: empresa.accent,
                    }}
                  >
                    {empresa.nome.charAt(0)}
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>

                <h2 className="mt-6 font-display text-2xl font-semibold tracking-tight text-foreground">
                  {empresa.nome}
                </h2>

                <p className="mt-2 text-sm text-muted-foreground">
                  {empresa.marcas.length} {empresa.marcas.length === 1 ? "marca" : "marcas"}
                </p>

                <span
                  className="mt-8 inline-flex items-center text-sm font-medium opacity-70 transition-opacity group-hover:opacity-100"
                  style={{ color: empresa.accent }}
                >
                  Ver marcas
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
