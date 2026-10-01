import { createFileRoute } from "@tanstack/react-router";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";

import { listarEmpresas } from "@/lib/empresas.functions";
import { Button } from "@/components/ui/button";
import vivalleLogo from "@/assets/logos/vivalle-refined.png";
import luminartechLogo from "@/assets/logos/luminartech-refined.png";
import vitrineLogo from "@/assets/logos/vitrine-refined.png";

const LOGOS: Record<string, { url: string }> = {
  vivalle: { url: vivalleLogo },
  luminartech: { url: luminartechLogo },
  vitrine: { url: vitrineLogo },
};

export const Route = createFileRoute("/_authenticated/estoque")({
  loader: () => listarEmpresas(),
  head: () => ({
    meta: [
      { title: "Estoque — Empresas do Grupo" },
      {
        name: "description",
        content:
          "Visão geral das empresas do grupo: Vivalle, Luminartech e Vitrine.",
      },
      { property: "og:title", content: "Estoque — Empresas do Grupo" },
      {
        property: "og:description",
        content:
          "Visão geral das empresas do grupo: Vivalle, Luminartech e Vitrine.",
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
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-estoque-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <nav className="flex items-center justify-between" aria-label="Navegação da página">
          <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" />
              Voltar ao início
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={sair}
            className="-mr-3 text-muted-foreground hover:text-foreground"
          >
            Sair
          </Button>
        </nav>

        <main className="flex flex-1 flex-col justify-center py-12 sm:py-16">
          <header className="mb-10 sm:mb-12">
            <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
              Selecione uma empresa
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              Toque em um dos cartões abaixo para abrir a visão detalhada de cada
              unidade de negócio.
            </p>
            <div className="mt-5 h-1 w-16 rounded-full bg-dashboard-amber" aria-hidden="true" />
          </header>

          <section aria-label="Empresas" className="grid gap-6 md:grid-cols-3">
          {EMPRESAS.map((empresa) => {
            const logo = LOGOS[empresa.slug];
            return (
              <Link
                key={empresa.slug}
                to="/empresa/$slug"
                params={{ slug: empresa.slug }}
                className="estoque-card group relative isolate flex min-h-80 flex-col overflow-hidden rounded-md border p-7 backdrop-blur-xl transition-[transform,border-color,box-shadow] duration-500 hover:-translate-y-2 sm:p-8"
                style={{ ["--empresa-accent" as string]: empresa.accent }}
              >
                <div className="estoque-card-wave pointer-events-none absolute -bottom-16 -right-12 -z-10 h-40 w-4/5 rotate-[-14deg] rounded-[50%] transition-transform duration-700 group-hover:scale-110" aria-hidden="true" />

                <div className="flex items-start justify-between">
                  <div className="estoque-logo h-20 w-20 shrink-0 overflow-hidden rounded-full border bg-foreground shadow-lg">
                    {logo ? (
                      <img
                        src={logo.url}
                        alt={`Logo da ${empresa.nome}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="estoque-accent-text flex h-full w-full items-center justify-center font-display text-xl font-bold">
                        {empresa.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="estoque-corner flex h-10 w-10 items-center justify-center rounded-md border text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                    <ArrowUpRight className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </div>

                <div className="relative z-10 mt-auto pt-10">
                  <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                    {empresa.nome}
                  </h2>
                  <p className="mt-1 text-base text-muted-foreground">
                    {empresa.marcas.length} {empresa.marcas.length === 1 ? "marca" : "marcas"}
                  </p>
                  <span className="estoque-accent-text mt-7 flex items-center gap-3 font-semibold">
                    Ver marcas
                    <span className="estoque-arrow flex h-10 w-10 items-center justify-center rounded-full transition-[transform,background-color,color] duration-300 group-hover:translate-x-1">
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
          </section>
        </main>
      </div>
    </div>
  );
}
