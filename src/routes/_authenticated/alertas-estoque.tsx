import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listarEmpresas } from "@/lib/empresas.functions";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";
import { listarAlertas } from "@/lib/estoque";

export const Route = createFileRoute("/_authenticated/alertas-estoque")({
  loader: () => listarEmpresas(),
  head: () => ({
    meta: [
      { title: "Alertas de estoque — Dashboard" },
      { name: "description", content: "Produtos próximos ou abaixo da quantidade mínima de estoque." },
      { property: "og:title", content: "Alertas de estoque — Dashboard" },
      { property: "og:description", content: "Produtos próximos ou abaixo da quantidade mínima de estoque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AlertasEstoque,
});

function AlertasEstoque() {
  const empresaAtual = useEmpresaObrigatoria();
  const alertas = listarAlertas(Route.useLoaderData().filter((e) => e.slug === empresaAtual?.slug));
  const criticos = alertas.filter((produto) => produto.nivel === "critico").length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Voltar ao início</Link>
        </Button>

        <header className="mt-7">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-dashboard-red-icon text-foreground shadow-dashboard-red">
              <AlertTriangle className="h-8 w-8" aria-hidden="true" />
            </div>
            <div><h1 className="font-display text-3xl font-bold text-foreground sm:text-5xl">Alertas de estoque</h1><p className="mt-1 text-muted-foreground">Produtos próximos ou abaixo da quantidade mínima.</p></div>
          </div>
          <div className="mt-5 h-1 w-14 rounded-full bg-dashboard-red" aria-hidden="true" />
        </header>

        {alertas.length === 0 ? (
          <div className="mt-10 flex min-h-56 flex-col items-center justify-center rounded-md border border-dashboard-green/40 bg-dashboard-green-soft p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-dashboard-green" aria-hidden="true" />
            <h2 className="mt-4 font-display text-xl font-semibold text-foreground">Estoque em dia</h2>
            <p className="mt-1 text-sm text-muted-foreground">Nenhum produto está próximo da quantidade mínima.</p>
          </div>
        ) : (
          <>
            <div className="mt-8 flex gap-3 text-sm"><span className="rounded-md bg-dashboard-red-soft px-3 py-2 text-dashboard-red">{criticos} críticos</span><span className="rounded-md bg-dashboard-amber-soft px-3 py-2 text-dashboard-amber">{alertas.length - criticos} em atenção</span></div>
            <section className="mt-4 grid gap-3" aria-label="Produtos com estoque baixo">
              {alertas.map((produto) => (
                <Link key={`${produto.empresaSlug}-${produto.marcaSlug}-${produto.codigo}-${produto.nome}`} to="/empresa/$slug/marca/$marca" params={{ slug: produto.empresaSlug, marca: produto.marcaSlug }} className={`group grid gap-4 rounded-md border p-5 transition-[transform,border-color] hover:-translate-y-0.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_36px] sm:items-center ${produto.nivel === "critico" ? "border-dashboard-red/55 bg-dashboard-red-soft" : "border-dashboard-amber/55 bg-dashboard-amber-soft"}`}>
                  <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${produto.nivel === "critico" ? "bg-dashboard-red" : "bg-dashboard-amber"}`} /><h2 className="truncate font-display text-lg font-semibold text-foreground">{produto.nome}</h2></div><p className="mt-1 pl-[18px] text-sm text-muted-foreground">{produto.empresa} · {produto.marca} · SKU {produto.codigo || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Mínimo</p><p className="font-semibold text-foreground">{produto.estoque_minimo.toLocaleString("pt-BR")}</p></div>
                  <div><p className="text-xs text-muted-foreground">Atual</p><p className={`font-display text-xl font-bold ${produto.nivel === "critico" ? "text-dashboard-red" : "text-dashboard-amber"}`}>{produto.estoque.toLocaleString("pt-BR")}</p></div>
                  <ArrowRight className="hidden h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 sm:block" aria-hidden="true" />
                </Link>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}