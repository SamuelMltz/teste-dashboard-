import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

import { EMPRESAS } from "@/lib/empresas";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel do Grupo — Visão Geral" },
      {
        name: "description",
        content:
          "Painel corporativo com a visão geral das empresas do grupo: Vivalle, Luminartech e Vitrine.",
      },
      { property: "og:title", content: "Painel do Grupo — Visão Geral" },
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
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="mb-12">
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
