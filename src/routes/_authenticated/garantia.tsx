import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, PackageOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/garantia")({
  head: () => ({
    meta: [
      { title: "Garantias e Devoluções — Dashboard" },
      { name: "description", content: "Área de garantias e devoluções das empresas do grupo." },
      { property: "og:title", content: "Garantias e Devoluções — Dashboard" },
      { property: "og:description", content: "Área de garantias e devoluções das empresas do grupo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Garantia,
});

function Garantia() {
  const [aba, setAba] = useState<"devolucoes" | "garantias">("devolucoes");
  const titulo = aba === "devolucoes" ? "Devoluções" : "Garantias";
  const Icon = aba === "devolucoes" ? PackageOpen : ShieldCheck;
  return (
    <div className="min-h-screen bg-estoque-canvas">
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8 sm:py-9">
        <Button variant="ghost" asChild className="-ml-3 gap-2 text-muted-foreground"><Link to="/"><ArrowLeft className="h-4 w-4" />Voltar ao início</Link></Button>
        <header className="mt-7 flex items-center gap-4">
          <div className="section-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-md"><Icon className="h-7 w-7" /></div>
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">{titulo}</h1>
        </header>
        <div role="tablist" aria-label="Garantias e devoluções" className="mt-5 flex gap-6 border-b border-border">
          <Button variant="ghost" role="tab" id="aba-devolucoes" aria-controls="painel-garantia" aria-selected={aba === "devolucoes"} onClick={() => setAba("devolucoes")} className="section-tab h-12 rounded-none px-3">Devoluções</Button>
          <Button variant="ghost" role="tab" id="aba-garantias" aria-controls="painel-garantia" aria-selected={aba === "garantias"} onClick={() => setAba("garantias")} className="section-tab h-12 rounded-none px-3">Garantias</Button>
        </div>
        <div role="tabpanel" id="painel-garantia" aria-labelledby={`aba-${aba}`} className="py-8"><p className="text-muted-foreground">Em breve.</p></div>
      </div>
    </div>
  );
}
