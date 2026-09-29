import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Painel do Grupo" },
      { name: "description", content: "Acesse a área de cadastro de marcas e produtos." },
      { property: "og:title", content: "Entrar — Painel do Grupo" },
      { property: "og:description", content: "Acesse a área de cadastro de marcas e produtos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin" });
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/admin" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) toast.error("E-mail ou senha incorretos.");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) toast.error(error.message);
      else toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
    }
    setCarregando(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Não foi possível entrar com o Google.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Voltar</Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-foreground">
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </h1>
        <form onSubmit={enviar} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={carregando}>
            {modo === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <Button variant="outline" className="mt-3 w-full" onClick={google}>Continuar com Google</Button>
        <button
          className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
        >
          {modo === "entrar" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
