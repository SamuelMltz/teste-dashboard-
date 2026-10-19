import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SENHA_LOGS = "7894";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({
    meta: [
      { title: "Registros — Painel do Grupo" },
      { name: "description", content: "Veja qual conta criou ou confirmou Fulls e pedidos." },
      { property: "og:title", content: "Registros — Painel do Grupo" },
      { property: "og:description", content: "Veja qual conta criou ou confirmou Fulls e pedidos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const [liberado, setLiberado] = useState(false);
  const [senha, setSenha] = useState("");
  function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (senha === SENHA_LOGS) setLiberado(true);
    else { toast.error("Senha incorreta."); setSenha(""); }
  }
  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Voltar ao início</Link>
        </Button>
        <header className="mt-5">
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Registros</h1>
          <p className="mt-1 text-muted-foreground">Histórico de quem criou, confirmou, cancelou ou excluiu Fulls e pedidos.</p>
          <div className="mt-4 h-1 w-12 rounded-full bg-section" aria-hidden="true" />
        </header>
        {liberado ? <Lista /> : (
          <form onSubmit={entrar} className="mt-10 max-w-sm space-y-3 rounded-md border border-border bg-background/30 p-6">
            <label htmlFor="senha-logs" className="flex items-center gap-2 text-sm text-foreground"><Lock className="h-4 w-4" /> Digite a senha para abrir</label>
            <Input id="senha-logs" type="password" inputMode="numeric" autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} />
            <Button type="submit" className="gerenciar-primary w-full">Entrar</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Lista() {
  const [busca, setBusca] = useState("");
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["sistema-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_logs");
      if (error) throw error;
      return data ?? [];
    },
  });
  const t = busca.trim().toLowerCase();
  const vis = data.filter((l) => !t || [l.email, l.empresa, l.acao, l.detalhe].some((v) => (v ?? "").toLowerCase().includes(t)));
  return (
    <section className="mt-8">
      <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por conta, empresa, ação ou número" className="max-w-md" />
      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>{["Data", "Conta", "Empresa", "Ação", "Detalhe"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>
              : error ? <tr><td colSpan={5} className="py-8 text-center text-dashboard-red">Não foi possível carregar (apenas administradores).</td></tr>
              : vis.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum registro ainda.</td></tr>
              : vis.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                  <td className="px-4 py-3 text-foreground">{l.email ?? "—"}</td>
                  <td className="px-4 py-3 text-foreground">{l.empresa ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-section">{l.acao}</td>
                  <td className="px-4 py-3 text-foreground">{l.detalhe}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
