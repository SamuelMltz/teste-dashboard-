import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, Package } from "lucide-react";

import { getMarca } from "@/lib/empresas";
import { buscarEmpresa } from "@/lib/empresas.functions";
import { nivelEstoque } from "@/lib/estoque";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/empresa/$slug/marca/$marca")({
  loader: async ({ params }) => {
    const empresa = await buscarEmpresa({ data: { slug: params.slug } });
    if (!empresa) throw notFound();
    const marca = getMarca(empresa, params.marca);
    if (!marca) throw notFound();
    return { empresa, marca };
  },
  head: ({ loaderData }) => {
    const titulo = loaderData ? `${loaderData.marca.nome} — Estoque` : "Marca não encontrada";
    return {
      meta: [
        { title: titulo },
        { name: "description", content: "Produtos e quantidade em estoque da marca." },
        { property: "og:title", content: titulo },
        { property: "og:description", content: "Produtos e quantidade em estoque da marca." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: MarcaEstoque,
});

function MarcaEstoque() {
  const { empresa, marca } = Route.useLoaderData();

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas" style={{ ["--empresa-accent" as string]: empresa.accent }}>
      <div className="pointer-events-none absolute inset-0 bg-estoque-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/empresa/$slug" params={{ slug: empresa.slug }}>
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Voltar para {empresa.nome}
          </Link>
        </Button>

        <header className="mt-7 flex items-center gap-4">
          <div className="estoque-product-mark flex h-14 w-14 shrink-0 items-center justify-center rounded-full border sm:h-16 sm:w-16">
            <Package className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground sm:text-5xl">{marca.nome}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Produtos e quantidade em estoque</p>
          </div>
        </header>
        <div className="mt-4 h-1 w-14 rounded-full estoque-product-accent" aria-hidden="true" />

        {marca.produtos.length === 0 ? (
          <div className="mt-10 rounded-md border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </div>
        ) : (
          <div className="estoque-product-table mt-10 overflow-hidden rounded-md border">
            <table className="hidden w-full text-left sm:table">
              <thead className="border-b border-border text-sm text-muted-foreground">
                <tr>
                  <th className="w-32 px-6 py-4 font-medium">SKU</th><th className="w-32 px-6 py-4 font-medium">COD</th>
                  <th className="px-6 py-4 font-medium">Produto</th>
                  <th className="px-6 py-4 text-right font-medium">Mínimo</th>
                  <th className="px-6 py-4 text-right font-medium">Em estoque</th>
                </tr>
              </thead>
              <tbody>
                {marca.produtos.map((p) => {
                  const nivel = nivelEstoque(p);
                  return (
                    <tr key={`${p.codigo}-${p.nome}`} className="border-b border-border/70 last:border-0">
                      <td className="px-6 py-5 font-mono text-sm text-muted-foreground">{p.codigo || "—"}</td><td className="px-6 py-5 font-mono text-sm text-muted-foreground">{p.cod || "—"}</td>
                      <td className="px-6 py-5 font-medium text-foreground">{p.nome}</td>
                      <td className="px-6 py-5 text-right text-muted-foreground">{p.estoque_minimo.toLocaleString("pt-BR")}</td>
                      <td className={`px-6 py-5 text-right font-display text-lg font-bold ${nivel === "critico" ? "text-dashboard-red" : nivel === "atencao" ? "text-dashboard-amber" : "text-foreground"}`}>
                        <span className="inline-flex items-center gap-2">{nivel !== "normal" && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}{p.estoque.toLocaleString("pt-BR")}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="divide-y divide-border/70 sm:hidden">
              {marca.produtos.map((p) => {
                const nivel = nivelEstoque(p);
                return (
                  <article key={`${p.codigo}-${p.nome}`} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0"><p className="font-medium text-foreground">{p.nome}</p><p className="mt-1 font-mono text-xs text-muted-foreground">SKU {p.codigo || "—"} · COD {p.cod || "—"}</p></div>
                      <span className={`inline-flex items-center gap-1 font-display text-xl font-bold ${nivel === "critico" ? "text-dashboard-red" : nivel === "atencao" ? "text-dashboard-amber" : "text-foreground"}`}>{nivel !== "normal" && <AlertTriangle className="h-4 w-4" />}{p.estoque.toLocaleString("pt-BR")}</span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">Mínimo: {p.estoque_minimo.toLocaleString("pt-BR")}</p>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
