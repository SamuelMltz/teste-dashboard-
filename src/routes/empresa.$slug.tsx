import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ArrowLeft, Target, TrendingDown, TrendingUp, Users } from "lucide-react";

import { GraficoFaturamento } from "@/components/GraficoFaturamento";
import { fmtBRL, fmtBRLCurto, getEmpresa } from "@/lib/empresas";

export const Route = createFileRoute("/empresa/$slug")({
  loader: ({ params }) => {
    const empresa = getEmpresa(params.slug);
    if (!empresa) throw notFound();
    return { empresa };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Empresa não encontrada" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { empresa } = loaderData;
    return {
      meta: [
        { title: `${empresa.nome} — Painel Detalhado` },
        {
          name: "description",
          content: `Indicadores detalhados da ${empresa.nome}: faturamento, clientes e desempenho mensal.`,
        },
        { property: "og:title", content: `${empresa.nome} — Painel Detalhado` },
        {
          property: "og:description",
          content: `Indicadores detalhados da ${empresa.nome}: faturamento, clientes e desempenho mensal.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: EmpresaDetalhe,
});

function EmpresaDetalhe() {
  const { empresa } = Route.useLoaderData();
  const { kpis } = empresa;
  const positivo = kpis.variacaoMensal >= 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para as empresas
        </Link>

        <header className="mt-6 flex flex-wrap items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-2xl font-bold"
            style={{
              backgroundColor: `${empresa.accent}1a`,
              color: empresa.accent,
            }}
          >
            {empresa.nome.charAt(0)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {empresa.nome}
            </h1>
            <p className="text-sm text-muted-foreground">
              Indicadores de setembro · dados de exemplo
            </p>
          </div>
        </header>

        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Faturamento do mês</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
              {fmtBRLCurto(kpis.faturamentoMes)}
            </p>
            <p
              className={`mt-2 flex items-center gap-1 text-sm font-semibold ${
                positivo ? "text-chart-2" : "text-destructive"
              }`}
            >
              {positivo ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              {positivo ? "+" : ""}
              {kpis.variacaoMensal.toLocaleString("pt-BR", {
                minimumFractionDigits: 1,
              })}
              % vs. mês anterior
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Clientes ativos</p>
            <p className="mt-2 flex items-center gap-2 font-display text-3xl font-bold tracking-tight text-foreground">
              <Users className="h-6 w-6 text-muted-foreground" />
              {kpis.clientesAtivos.toLocaleString("pt-BR")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Ticket médio</p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
              {fmtBRL(kpis.ticketMedio)}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              Meta anual
            </p>
            <p className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
              {(kpis.metaAnualProgress * 100).toLocaleString("pt-BR", {
                maximumFractionDigits: 0,
              })}
              %
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${kpis.metaAnualProgress * 100}%`,
                  backgroundColor: empresa.accent,
                }}
              />
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Faturamento mensal
            </h2>
            <p className="text-sm text-muted-foreground">Últimos 12 meses</p>
          </div>
          <GraficoFaturamento dados={empresa.serieMensal} accent={empresa.accent} />
        </section>
      </div>
    </div>
  );
}
