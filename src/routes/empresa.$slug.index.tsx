import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/empresa/$slug/")({
  head: ({ loaderData }) => {
    const nome = loaderData?.empresa.nome ?? "Empresa";
    return {
      meta: [
        { title: `${nome} — Marcas` },
        { name: "description", content: `Marcas vendidas pela ${nome} e seus produtos em estoque.` },
        { property: "og:title", content: `${nome} — Marcas` },
        { property: "og:description", content: `Marcas vendidas pela ${nome} e seus produtos em estoque.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: EmpresaMarcas,
});

function EmpresaMarcas() {
  const { empresa } = Route.useParent().useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Voltar para as empresas
        </Link>

        <header className="mt-6 flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl font-display text-2xl font-bold"
            style={{ backgroundColor: `${empresa.accent}1a`, color: empresa.accent }}
          >
            {empresa.nome.charAt(0)}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {empresa.nome}
            </h1>
            <p className="text-sm text-muted-foreground">Marcas que a empresa vende</p>
          </div>
        </header>

        {empresa.marcas.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhuma marca cadastrada ainda.
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {empresa.marcas.map((marca) => (
              <Link
                key={marca.slug}
                to="/empresa/$slug/marca/$marca"
                params={{ slug: empresa.slug, marca: marca.slug }}
                className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <h2 className="font-display text-xl font-semibold text-foreground">{marca.nome}</h2>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {marca.produtos.length} {marca.produtos.length === 1 ? "produto" : "produtos"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
