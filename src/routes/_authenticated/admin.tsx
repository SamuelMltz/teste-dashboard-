import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Cadastro — Painel do Grupo" },
      { name: "description", content: "Cadastre marcas, produtos e estoque das empresas." },
      { property: "og:title", content: "Cadastro — Painel do Grupo" },
      { property: "og:description", content: "Cadastre marcas, produtos e estoque das empresas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Produto = { id: string; nome: string; estoque: number };
type Marca = { id: string; nome: string; slug: string; produtos: Produto[] };
type Empresa = { id: string; nome: string; accent: string; marcas: Marca[] };

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function AdminPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const admin = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      return !!data;
    },
  });

  const dados = useQuery({
    queryKey: ["admin-empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, nome, accent, marcas(id, nome, slug, produtos(id, nome, estoque))")
        .order("ordem");
      if (error) throw error;
      return data as Empresa[];
    },
  });

  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin-empresas"] });

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (admin.isLoading || dados.isLoading) return <div className="min-h-screen bg-background p-10 text-muted-foreground">Carregando…</div>;

  if (!admin.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
        <p className="text-foreground">Sua conta não tem permissão para cadastrar.</p>
        <Button variant="outline" onClick={sair}>Sair</Button>
      </div>
    );
  }

  const empresas = dados.data ?? [];
  const empresa = empresas.find((e) => e.id === empresaId) ?? empresas[0];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao painel
          </Link>
          <Button variant="ghost" size="sm" onClick={sair}>Sair</Button>
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold text-foreground">Cadastro</h1>

        <div className="mt-6 flex flex-wrap gap-2">
          {empresas.map((e) => (
            <button
              key={e.id}
              onClick={() => setEmpresaId(e.id)}
              className="rounded-full border px-4 py-1.5 text-sm font-medium transition-colors"
              style={
                e.id === empresa?.id
                  ? { borderColor: e.accent, color: e.accent, backgroundColor: `${e.accent}1a` }
                  : undefined
              }
            >
              {e.nome}
            </button>
          ))}
        </div>

        {empresa && <EmpresaEditor key={empresa.id} empresa={empresa} onChange={recarregar} />}
      </div>
    </div>
  );
}

function EmpresaEditor({ empresa, onChange }: { empresa: Empresa; onChange: () => void }) {
  const [novaMarca, setNovaMarca] = useState("");

  async function addMarca(e: React.FormEvent) {
    e.preventDefault();
    const nome = novaMarca.trim();
    if (!nome) return;
    const { error } = await supabase.from("marcas").insert({ empresa_id: empresa.id, nome, slug: slugify(nome) });
    if (error) return toast.error("Não foi possível criar a marca (talvez já exista).");
    setNovaMarca("");
    toast.success("Marca criada");
    onChange();
  }

  return (
    <div className="mt-8 space-y-6">
      <form onSubmit={addMarca} className="flex gap-2">
        <Input placeholder={`Nova marca da ${empresa.nome}`} value={novaMarca} onChange={(e) => setNovaMarca(e.target.value)} />
        <Button type="submit"><Plus className="h-4 w-4" /> Marca</Button>
      </form>
      {empresa.marcas.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">Nenhuma marca ainda.</p>
      )}
      {empresa.marcas.map((m) => <MarcaEditor key={m.id} marca={m} onChange={onChange} />)}
    </div>
  );
}

function MarcaEditor({ marca, onChange }: { marca: Marca; onChange: () => void }) {
  const [nome, setNome] = useState("");
  const [estoque, setEstoque] = useState("");

  async function addProduto(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const { error } = await supabase.from("produtos").insert({ marca_id: marca.id, nome: nome.trim(), estoque: Number(estoque) || 0 });
    if (error) return toast.error("Não foi possível criar o produto.");
    setNome("");
    setEstoque("");
    onChange();
  }

  async function apagarMarca() {
    if (!confirm(`Apagar a marca "${marca.nome}" e todos os produtos dela?`)) return;
    const { error } = await supabase.from("marcas").delete().eq("id", marca.id);
    if (error) return toast.error("Não foi possível apagar.");
    onChange();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">{marca.nome}</h2>
        <Button variant="ghost" size="icon" onClick={apagarMarca} aria-label="Apagar marca"><Trash2 className="h-4 w-4" /></Button>
      </div>
      <div className="mt-4 space-y-2">
        {marca.produtos.map((p) => <ProdutoLinha key={p.id} produto={p} onChange={onChange} />)}
      </div>
      <form onSubmit={addProduto} className="mt-4 flex gap-2">
        <Input placeholder="Novo produto" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input className="w-28" type="number" min={0} placeholder="Estoque" value={estoque} onChange={(e) => setEstoque(e.target.value)} />
        <Button type="submit" variant="secondary"><Plus className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function ProdutoLinha({ produto, onChange }: { produto: Produto; onChange: () => void }) {
  const [estoque, setEstoque] = useState(String(produto.estoque));

  async function salvar() {
    const n = Number(estoque);
    if (Number.isNaN(n) || n === produto.estoque) return;
    const { error } = await supabase.from("produtos").update({ estoque: n }).eq("id", produto.id);
    if (error) return toast.error("Não foi possível salvar.");
    toast.success("Estoque atualizado");
    onChange();
  }

  async function apagar() {
    if (!confirm(`Apagar "${produto.nome}"?`)) return;
    const { error } = await supabase.from("produtos").delete().eq("id", produto.id);
    if (error) return toast.error("Não foi possível apagar.");
    onChange();
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-foreground">{produto.nome}</span>
      <Input
        className="w-28 text-right"
        type="number"
        min={0}
        value={estoque}
        onChange={(e) => setEstoque(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => e.key === "Enter" && salvar()}
      />
      <Button variant="ghost" size="icon" onClick={apagar} aria-label="Apagar produto"><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}
