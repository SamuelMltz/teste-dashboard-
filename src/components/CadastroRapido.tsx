import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EmpresaRef = { id: string; nome: string };

function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mensagemErro(msg: string, oque: string) {
  if (msg.includes("row-level")) return `Só administradores podem cadastrar ${oque}.`;
  if (msg.includes("duplicate")) return `Já existe ${oque === "marcas" ? "uma marca" : "um produto"} com esse nome.`;
  return `Não foi possível salvar: ${msg}`;
}

const chaveMarcas = (empresaId: string) => ["cadastro-rapido-marcas", empresaId];

function useMarcas(empresaId: string, ativo: boolean) {
  return useQuery({
    queryKey: chaveMarcas(empresaId),
    enabled: ativo,
    queryFn: async () => {
      const { data, error } = await supabase.from("marcas").select("id, nome, ordem").eq("empresa_id", empresaId).order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useAtualizar(empresaId: string) {
  const qc = useQueryClient();
  const router = useRouter();
  return async () => {
    await qc.invalidateQueries({ queryKey: chaveMarcas(empresaId) });
    await router.invalidate();
  };
}

export function NovaMarcaModal({ empresa, aberto, onFechar }: { empresa: EmpresaRef; aberto: boolean; onFechar: () => void }) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const marcas = useMarcas(empresa.id, aberto);
  const atualizar = useAtualizar(empresa.id);

  function fechar() { setNome(""); setErro(""); onFechar(); }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    const n = nome.trim();
    if (!n) { setErro("Informe o nome da marca."); return; }
    if (n.length > 100) { setErro("O nome pode ter no máximo 100 caracteres."); return; }
    const slug = slugify(n);
    if (!slug) { setErro("Use pelo menos uma letra ou número no nome."); return; }
    setSalvando(true);
    const { error } = await supabase.from("marcas").insert({ empresa_id: empresa.id, nome: n, slug, ordem: marcas.data?.length ?? 0 });
    setSalvando(false);
    if (error) { toast.error(mensagemErro(error.message, "marcas")); return; }
    await atualizar();
    toast.success(`Marca "${n}" cadastrada`);
    fechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o && !salvando) fechar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova marca</DialogTitle>
          <DialogDescription>A marca será cadastrada na empresa {empresa.nome}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="nova-marca-nome">Nome da marca *</Label>
            <Input id="nova-marca-nome" autoFocus maxLength={100} value={nome} onChange={(e) => { setNome(e.target.value); setErro(""); }} aria-invalid={!!erro} />
            {erro && <p className="text-sm text-dashboard-red">{erro}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="gap-2">{salvando && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Erros = Partial<Record<"nome" | "marca" | "estoque" | "minimo", string>>;

export function NovoProdutoModal({ empresa, aberto, onFechar, onNovaMarca }: { empresa: EmpresaRef; aberto: boolean; onFechar: () => void; onNovaMarca: () => void }) {
  const vazio = { nome: "", marcaId: "", sku: "", cod: "", estoque: "0", minimo: "0" };
  const [f, setF] = useState(vazio);
  const [erros, setErros] = useState<Erros>({});
  const [salvando, setSalvando] = useState(false);
  const marcas = useMarcas(empresa.id, aberto);
  const atualizar = useAtualizar(empresa.id);

  function campo<K extends keyof typeof vazio>(k: K, v: string) { setF((x) => ({ ...x, [k]: v })); setErros((e) => ({ ...e, [k === "marcaId" ? "marca" : k]: undefined })); }
  function fechar() { setF(vazio); setErros({}); onFechar(); }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (salvando) return;
    const novos: Erros = {};
    if (!f.nome.trim()) novos.nome = "Informe o nome do produto.";
    else if (f.nome.trim().length > 200) novos.nome = "O nome pode ter no máximo 200 caracteres.";
    if (!f.marcaId) novos.marca = "Escolha a marca.";
    const est = Number(f.estoque), min = Number(f.minimo);
    if (!Number.isInteger(est) || est < 0) novos.estoque = "Use um número inteiro a partir de 0.";
    if (!Number.isInteger(min) || min < 0) novos.minimo = "Use um número inteiro a partir de 0.";
    setErros(novos);
    if (Object.keys(novos).length) return;
    setSalvando(true);
    const { count } = await supabase.from("produtos").select("id", { count: "exact", head: true }).eq("marca_id", f.marcaId);
    const { error } = await supabase.from("produtos").insert({
      marca_id: f.marcaId, nome: f.nome.trim(), codigo: f.sku.trim().slice(0, 100), cod: f.cod.trim().slice(0, 100),
      estoque: est, estoque_minimo: min, ordem: count ?? 0,
    });
    setSalvando(false);
    if (error) { toast.error(mensagemErro(error.message, "produtos")); return; }
    await atualizar();
    toast.success(`Produto "${f.nome.trim()}" cadastrado`);
    fechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => { if (!o && !salvando) fechar(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo produto</DialogTitle>
          <DialogDescription>O produto será cadastrado na empresa {empresa.nome}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="np-nome">Nome do produto *</Label>
            <Input id="np-nome" autoFocus maxLength={200} value={f.nome} onChange={(e) => campo("nome", e.target.value)} aria-invalid={!!erros.nome} />
            {erros.nome && <p className="text-sm text-dashboard-red">{erros.nome}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="np-marca">Marca *</Label>
            <Select value={f.marcaId} onValueChange={(v) => campo("marcaId", v)}>
              <SelectTrigger id="np-marca" aria-invalid={!!erros.marca}><SelectValue placeholder={marcas.isLoading ? "Carregando marcas…" : "Escolha a marca"} /></SelectTrigger>
              <SelectContent>
                {(marcas.data ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {!marcas.isLoading && (marcas.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma marca nesta empresa. <button type="button" className="underline" onClick={onNovaMarca}>Cadastrar marca</button></p>
            )}
            {erros.marca && <p className="text-sm text-dashboard-red">{erros.marca}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="np-sku">SKU</Label><Input id="np-sku" maxLength={100} value={f.sku} onChange={(e) => campo("sku", e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="np-cod">COD</Label><Input id="np-cod" maxLength={100} value={f.cod} onChange={(e) => campo("cod", e.target.value)} /></div>
            <div className="space-y-2">
              <Label htmlFor="np-estoque">Estoque atual</Label>
              <Input id="np-estoque" type="number" min={0} step={1} value={f.estoque} onChange={(e) => campo("estoque", e.target.value)} aria-invalid={!!erros.estoque} />
              {erros.estoque && <p className="text-sm text-dashboard-red">{erros.estoque}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="np-minimo">Estoque mínimo</Label>
              <Input id="np-minimo" type="number" min={0} step={1} value={f.minimo} onChange={(e) => campo("minimo", e.target.value)} aria-invalid={!!erros.minimo} />
              {erros.minimo && <p className="text-sm text-dashboard-red">{erros.minimo}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar} disabled={salvando}>Cancelar</Button>
            <Button type="submit" disabled={salvando} className="gap-2">{salvando && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
