import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Lock, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { excluirConta, trocarSenhaConta } from "@/lib/contas.functions";

const SENHA_CONTAS = "7894";

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({
    meta: [
      { title: "Contas — Painel do Grupo" },
      { name: "description", content: "Gerencie quais contas podem administrar o sistema." },
      { property: "og:title", content: "Contas — Painel do Grupo" },
      { property: "og:description", content: "Gerencie quais contas podem administrar o sistema." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContasPage,
});

function ContasPage() {
  const { user } = Route.useRouteContext();
  const [liberado, setLiberado] = useState(false);
  const [senha, setSenha] = useState("");

  function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (senha === SENHA_CONTAS) setLiberado(true);
    else { toast.error("Senha incorreta."); setSenha(""); }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-estoque-canvas">
      <div className="pointer-events-none absolute inset-0 bg-gerenciar-atmosphere" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-10">
        <Button variant="ghost" asChild className="group -ml-3 gap-2 text-muted-foreground hover:text-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" /> Voltar ao início</Link>
        </Button>
        <header className="mt-5">
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Contas</h1>
          <p className="mt-1 text-muted-foreground">Escolha quais contas também podem administrar o sistema.</p>
          <div className="mt-4 h-1 w-12 rounded-full bg-section" aria-hidden="true" />
        </header>
        {liberado ? <ListaContas meuId={user.id} /> : (
          <form onSubmit={entrar} className="mt-10 max-w-sm space-y-3 rounded-md border border-border bg-background/30 p-6">
            <label htmlFor="senha-contas" className="flex items-center gap-2 text-sm text-foreground"><Lock className="h-4 w-4" /> Digite a senha para abrir</label>
            <Input id="senha-contas" type="password" inputMode="numeric" autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} />
            <Button type="submit" className="gerenciar-primary w-full">Entrar</Button>
          </form>
        )}
      </div>
    </div>
  );
}

function ListaContas({ meuId }: { meuId: string }) {
  const qc = useQueryClient();
  const contas = useQuery({
    queryKey: ["contas-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_usuarios_admin");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function alterar(id: string, admin: boolean) {
    const { error } = await supabase.rpc("definir_admin", { _user_id: id, _admin: admin });
    if (error) { toast.error(error.message); return; }
    toast.success(admin ? "Conta promovida a administradora" : "Acesso de administrador removido");
    qc.invalidateQueries({ queryKey: ["contas-admin"] });
  }

  async function trocarSenha(id: string, email: string) {
    const senha = prompt(`Nova senha para ${email} (mínimo 6 caracteres):`);
    if (senha === null) return;
    if (senha.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres."); return; }
    try { await trocarSenhaConta({ data: { userId: id, senha } }); toast.success("Senha trocada"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível trocar a senha."); }
  }

  async function excluir(id: string, email: string) {
    if (!confirm(`Excluir a conta ${email}? Essa pessoa não poderá mais entrar.`)) return;
    try { await excluirConta({ data: { userId: id } }); toast.success("Conta excluída"); qc.invalidateQueries({ queryKey: ["contas-admin"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível excluir a conta."); }
  }

  if (contas.error) return <p className="mt-8 text-muted-foreground">Só administradores podem ver as contas.</p>;

  return (
    <div className="mt-8 grid gap-2">
      {contas.isLoading ? <p className="text-muted-foreground">Carregando contas…</p> : (contas.data ?? []).map((c) => (
        <div key={c.id} className="gerenciar-card flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{c.email}{c.id === meuId ? " (você)" : ""}</p>
            <p className="text-xs text-muted-foreground">{c.is_admin ? "Administrador" : "Usuário comum"}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => trocarSenha(c.id, c.email ?? "")}><KeyRound className="h-4 w-4" />Trocar senha</Button>
            {c.is_admin ? (
              <Button variant="outline" disabled={c.id === meuId} onClick={() => alterar(c.id, false)}>Remover administrador</Button>
            ) : (
              <Button className="gerenciar-primary" onClick={() => alterar(c.id, true)}>Tornar administrador</Button>
            )}
            {c.id !== meuId && <Button variant="ghost" size="icon" className="text-dashboard-red hover:text-dashboard-red" aria-label={`Excluir conta ${c.email}`} onClick={() => excluir(c.id, c.email ?? "")}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>
      ))}
    </div>
  );
}
