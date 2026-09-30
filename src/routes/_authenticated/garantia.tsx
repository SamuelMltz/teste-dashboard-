import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/garantia")({
  head: () => ({
    meta: [
      { title: "Garantia — Painel do Grupo" },
      { name: "description", content: "Área de garantias do painel do grupo." },
      { property: "og:title", content: "Garantia — Painel do Grupo" },
      { property: "og:description", content: "Área de garantias do painel do grupo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Garantia,
});

function Garantia() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground">Garantia</h1>
        <p className="mt-3 text-muted-foreground">Em breve.</p>
      </div>
    </div>
  );
}
