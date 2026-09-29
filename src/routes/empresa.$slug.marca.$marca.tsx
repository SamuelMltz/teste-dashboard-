import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { getMarca } from "@/lib/empresas";

export const Route = createFileRoute("/empresa/$slug/marca/$marca")({
  loader: ({ params, parentMatchPromise }) => parentMatchPromise.then((p) => {
    const empresa = (p.loaderData as { empresa: import("@/lib/empresas").Empresa }).empresa;
    const marca = getMarca(empresa, params.marca);
    if (!marca) throw notFound();
    return { empresa, marca };
  }),
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link
          to="/empresa/$slug"
          params={{ slug: empresa.slug }}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para {empresa.nome}
        </Link>

        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {marca.nome}
        </h1>
        <p className="text-sm text-muted-foreground">Produtos e quantidade em estoque</p>

        {marca.produtos.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhum produto cadastrado ainda.
          </div>
        ) : (
          <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left">
              <thead className="border-b border-border text-sm text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">Produto</th>
                  <th className="px-6 py-3 text-right font-medium">Em estoque</th>
                </tr>
              </thead>
              <tbody>
                {marca.produtos.map((p) => (
                  <tr key={p.nome} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 text-foreground">{p.nome}</td>
                    <td className="px-6 py-4 text-right font-display font-semibold text-foreground">
                      {p.estoque.toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
