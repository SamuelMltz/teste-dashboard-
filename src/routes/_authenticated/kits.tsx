import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarraEmpresa } from "@/components/BarraEmpresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";

export const Route = createFileRoute("/_authenticated/kits")({
  head: () => ({ meta: [
    { title: "Kits — Composição de produtos" },
    { name: "description", content: "Defina quais produtos e quantidades formam cada kit vendido no Mercado Livre." },
    { property: "og:title", content: "Kits — Composição de produtos" },
    { property: "og:description", content: "Defina quais produtos e quantidades formam cada kit vendido no Mercado Livre." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Kits,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Kits() {
  const empresa = useEmpresaObrigatoria();
  const qc = useQueryClient();
  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");

  const { data: produtos } = useQuery({
    queryKey: ["kits-produtos", empresa?.id], enabled: !!empresa,
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, nome, codigo, marcas!inner(empresa_id)").eq("marcas.empresa_id", empresa!.id).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: kits, isError } = useQuery({
    queryKey: ["kits", empresa?.id], enabled: !!empresa,
    queryFn: async () => {
      const { data, error } = await supabase.from("kits").select("id, sku, nome, kit_itens(id, produto_id, quantidade)").eq("empresa_id", empresa!.id).order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["kits", empresa?.id] });

  async function criar() {
    if (!sku.trim() || !nome.trim()) return toast.error("Informe o SKU e o nome do kit.");
    if (produtos?.some((p) => norm(p.codigo) === norm(sku))) return toast.error("Esse SKU já é de um produto avulso.");
    const { error } = await supabase.from("kits").insert({ empresa_id: empresa!.id, sku: sku.trim(), nome: nome.trim() });
    if (error) return toast.error(error.code === "23505" ? "Já existe um kit com esse SKU." : "Não foi possível criar o kit.");
    setSku(""); setNome(""); recarregar();
    return undefined;
  }

  if (!empresa) return null;
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Voltar</Link>
      <BarraEmpresa />
      <div>
        <h1 className="text-2xl font-bold">Kits</h1>
        <p className="text-sm text-muted-foreground">Kits não têm estoque: no Full e no PDF de estoque, cada kit vira os produtos que o compõem.</p>
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-4">
        <Input placeholder="SKU do kit no Mercado Livre" value={sku} onChange={(e) => setSku(e.target.value)} className="max-w-56" />
        <Input placeholder="Nome do kit" value={nome} onChange={(e) => setNome(e.target.value)} className="min-w-48 flex-1" />
        <Button onClick={criar} className="gap-2"><Plus className="h-4 w-4" />Criar kit</Button>
      </div>
      {isError && <p className="text-sm text-destructive">Só administradores podem ver os kits.</p>}
      {kits?.length === 0 && <p className="text-sm text-muted-foreground">Nenhum kit cadastrado nesta empresa.</p>}
      {kits?.map((k) => <CartaoKit key={k.id} kit={k} produtos={produtos ?? []} onChange={recarregar} />)}
    </div>
  );
}

type KitRow = { id: string; sku: string; nome: string; kit_itens: { id: string; produto_id: string; quantidade: number }[] };

function CartaoKit({ kit, produtos, onChange }: { kit: KitRow; produtos: { id: string; nome: string; codigo: string }[]; onChange: () => void }) {
  const [busca, setBusca] = useState("");
  const mapa = new Map(produtos.map((p) => [p.id, p]));
  const achados = busca.trim() ? produtos.filter((p) => !kit.kit_itens.some((i) => i.produto_id === p.id) && (norm(p.nome).includes(norm(busca)) || norm(p.codigo).includes(norm(busca)))).slice(0, 6) : [];

  async function rodar(p: PromiseLike<{ error: unknown }>) { const { error } = await p; if (error) toast.error("Não foi possível salvar."); onChange(); }
  const adicionar = (produto_id: string) => { setBusca(""); rodar(supabase.from("kit_itens").insert({ kit_id: kit.id, produto_id, quantidade: 1 })); };
  const mudarQtd = (id: string, q: number) => { if (q >= 1) rodar(supabase.from("kit_itens").update({ quantidade: q }).eq("id", id)); };
  const excluirKit = () => { if (confirm(`Excluir o kit ${kit.nome}?`)) rodar(supabase.from("kits").delete().eq("id", kit.id)); };

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div><p className="font-semibold">{kit.nome}</p><p className="text-xs text-muted-foreground">SKU {kit.sku}</p></div>
        <Button variant="ghost" size="icon" aria-label="Excluir kit" onClick={excluirKit}><Trash2 className="h-4 w-4" /></Button>
      </div>
      {kit.kit_itens.length === 0 && <p className="text-sm text-destructive">Adicione os produtos do kit; sem eles o kit não é aberto.</p>}
      <ul className="space-y-2">
        {kit.kit_itens.map((i) => { const p = mapa.get(i.produto_id); return (
          <li key={i.id} className="flex items-center gap-2 text-sm">
            <Input type="number" min={1} defaultValue={i.quantidade} onBlur={(e) => mudarQtd(i.id, Math.floor(Number(e.target.value)))} className="w-20" aria-label="Quantidade por kit" />
            <span className="text-muted-foreground">×</span>
            <span className="flex-1">{p?.nome ?? "Produto removido"} <span className="text-xs text-muted-foreground">{p?.codigo}</span></span>
            <Button variant="ghost" size="icon" aria-label="Remover produto" onClick={() => rodar(supabase.from("kit_itens").delete().eq("id", i.id))}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ); })}
      </ul>
      <div className="relative">
        <Input placeholder="Adicionar produto: busque por nome ou SKU" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {achados.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
            {achados.map((p) => <button key={p.id} type="button" onClick={() => adicionar(p.id)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent">{p.nome} <span className="text-xs text-muted-foreground">{p.codigo}</span></button>)}
          </div>
        )}
      </div>
    </div>
  );
}
