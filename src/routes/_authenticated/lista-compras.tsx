import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReposicaoFisica } from "@/components/ReposicaoFisica";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";

export const Route = createFileRoute("/_authenticated/lista-compras")({
  head: () => ({ meta: [
    { title: "Lista de compras — Reposição do estoque físico" },
    { name: "description", content: "Veja o que comprar pelo estoque físico e os mínimos, e gere pedidos por marca." },
    { property: "og:title", content: "Lista de compras — Reposição do estoque físico" },
    { property: "og:description", content: "Veja o que comprar pelo estoque físico e os mínimos, e gere pedidos por marca." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ListaCompras,
});

function ListaCompras() {
  const empresa = useEmpresaObrigatoria();
  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground"><Link to="/pedidos"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />Voltar para Pedidos</Link></Button>
        <header className="mt-7 flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md section-icon text-foreground"><ClipboardList className="h-9 w-9" /></div><div><h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Lista de compras</h1><p className="mt-1 text-muted-foreground">{empresa?.nome} · reposição pelo estoque físico.</p></div></header>
        <div className="mt-5 h-1 w-16 rounded-full bg-section" />
        {empresa && <ReposicaoFisica empresaSlug={empresa.slug} titulo="Produtos para comprar" />}
      </div>
    </div>
  );
}
