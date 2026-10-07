import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Link2, PackagePlus, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { LinhaPdf } from "@/lib/pdf-import";
import type { TipoDoc } from "@/lib/importar-documento";

export type ProdutoDoc = { id: string; nome: string; codigo: string; cod: string; estoque: number; marca_id: string; marca: string; empresa_id: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const ITENS = { full: { tabela: "full_itens", fk: "carga_id" }, pedido: { tabela: "pedido_itens", fk: "pedido_id" } };

/** Soma a quantidade ao item existente ou cria um novo, lendo o estado atual do banco. */
export async function somarItem(tipo: TipoDoc, docId: string, produto: { id: string; nome: string }, quantidade: number) {
  const t = ITENS[tipo];
  const { data: existente } = await db.from(t.tabela).select("id, quantidade").eq(t.fk, docId).eq("produto_id", produto.id).maybeSingle();
  const res = existente
    ? await db.from(t.tabela).update({ quantidade: existente.quantidade + quantidade }).eq("id", existente.id)
    : await db.from(t.tabela).insert({ [t.fk]: docId, produto_id: produto.id, quantidade });
  if (res.error) { toast.error(`${produto.nome}: ${res.error.message}`); return false; }
  return true;
}

const overlay = "fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm";
const caixa = "max-h-[92vh] w-full overflow-y-auto rounded-md border border-border bg-estoque-canvas";

export function AdicionarProdutoModal({ tipo, docId, empresa, produtos, onFechar, onAdicionado }: {
  tipo: TipoDoc; docId: string; empresa: { id: string; nome: string }; produtos: ProdutoDoc[];
  onFechar: () => void; onAdicionado: () => Promise<unknown> | void;
}) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [qtd, setQtd] = useState("1");
  const [salvando, setSalvando] = useState(false);
  const [cadastrando, setCadastrando] = useState(false);
  const cor = tipo === "full" ? "text-dashboard-amber" : "text-dashboard-green";
  const borda = tipo === "full" ? "border-dashboard-amber" : "border-dashboard-green";

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return [];
    return produtos.filter((p) => p.nome.toLowerCase().includes(q) || p.cod.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 50);
  }, [busca, produtos]);
  const produto = produtos.find((p) => p.id === selecionado);

  async function adicionar(p = produto) {
    const n = Number(qtd);
    if (!p) { toast.error("Selecione um produto."); return; }
    if (!Number.isInteger(n) || n <= 0) { toast.error("Informe uma quantidade válida."); return; }
    setSalvando(true);
    const ok = await somarItem(tipo, docId, p, n);
    setSalvando(false);
    if (!ok) return;
    toast.success(`${p.nome} adicionado`);
    await onAdicionado();
    setSelecionado(null); setQtd("1");
  }

  if (cadastrando) {
    return <NovoProdutoModal tipo={tipo} empresa={empresa} produtos={produtos} linha={null} onFechar={() => setCadastrando(false)}
      onPronto={async (p) => { await adicionar(p); setCadastrando(false); }} />;
  }

  return (
    <div className={overlay} role="dialog" aria-modal="true" aria-labelledby="titulo-adicionar" onKeyDown={(e) => e.key === "Escape" && onFechar()}>
      <div className={`${caixa} max-w-3xl p-6 sm:p-8`}>
        <div className="flex items-start justify-between gap-4">
          <div><h2 id="titulo-adicionar" className="font-display text-3xl font-semibold text-foreground">Adicionar produto</h2><p className="mt-1 text-muted-foreground">Busque produtos da {empresa.nome}.</p></div>
          <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar"><X className="h-5 w-5" /></Button>
        </div>
        <div className="relative mt-6">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input autoFocus value={busca} onChange={(e) => { setBusca(e.target.value); setSelecionado(null); }} placeholder="Buscar por nome, COD ou SKU" aria-label="Buscar por nome, COD ou SKU" className="h-12 pl-12" />
        </div>
        <div className="mt-5 overflow-hidden rounded-md border border-border">
          <div className="grid grid-cols-[90px_100px_minmax(0,1fr)_80px] gap-2 bg-background/50 px-4 py-3 text-xs font-semibold tracking-wide text-foreground"><span>COD</span><span>SKU</span><span>PRODUTO</span><span className="text-right">ESTOQUE</span></div>
          <div className="max-h-72 overflow-y-auto">
            {!busca.trim() ? (
              <div className="flex flex-col items-center px-4 py-12 text-center"><span className={`flex h-20 w-20 items-center justify-center rounded-full border border-border ${cor}`}><Search className="h-9 w-9" /></span><p className="mt-5 font-display text-lg font-semibold text-foreground">Encontre o produto que deseja adicionar</p><p className="text-sm text-muted-foreground">Digite o nome, o COD do fornecedor ou o SKU interno.</p></div>
            ) : resultados.length === 0 ? (
              <p className="px-4 py-12 text-center text-muted-foreground">Nenhum produto encontrado para “{busca.trim()}”. Confira o texto ou cadastre um novo produto.</p>
            ) : resultados.map((p) => (
              <button key={p.id} type="button" onClick={() => setSelecionado(p.id)} aria-pressed={selecionado === p.id}
                className={`grid w-full grid-cols-[90px_100px_minmax(0,1fr)_80px] gap-2 border-t border-border px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-background/40 ${selecionado === p.id ? `border-l-4 ${borda} bg-background/50` : ""}`}>
                <span className="truncate">{p.cod || "—"}</span><span className="truncate">{p.codigo || "—"}</span>
                <span className="min-w-0"><span className="block truncate">{p.nome || "(sem nome)"}</span><span className="block truncate text-xs text-muted-foreground">{p.marca}</span></span>
                <span className="text-right">{p.estoque}</span>
              </button>
            ))}
          </div>
        </div>
        {produto && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-center">
            <p className="truncate text-sm text-foreground">Selecionado: <strong>{produto.nome}</strong></p>
            <Input type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} onKeyDown={(e) => e.key === "Enter" && adicionar()} aria-label="Quantidade" className="h-10" />
            <Button onClick={() => adicionar()} disabled={salvando} className="gerenciar-primary h-10 gap-2"><Plus className="h-4 w-4" />Adicionar</Button>
          </div>
        )}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
          <button type="button" onClick={() => setCadastrando(true)} className={`inline-flex items-center gap-2 text-sm font-medium ${cor}`}><Plus className="h-4 w-4" />Cadastrar novo produto</button>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

export function NovoProdutoModal({ linha, restantes = 0, tipo, empresa, produtos, opcoes, onFechar, onPronto }: {
  linha: LinhaPdf | null; restantes?: number; tipo: TipoDoc; empresa: { id: string; nome: string }; produtos: ProdutoDoc[];
  opcoes?: string[]; onFechar: () => void; onPronto: (p: ProdutoDoc) => Promise<void>;
}) {
  const ambiguo = !!opcoes?.length;
  const [modo, setModo] = useState<"novo" | "vincular">(ambiguo ? "vincular" : "novo");
  const [nome, setNome] = useState(linha?.nome ?? "");
  const [cod, setCod] = useState(linha?.cod ?? "");
  const [sku, setSku] = useState("");
  const [marcaId, setMarcaId] = useState("");
  const [existenteId, setExistenteId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const destino = tipo === "full" ? "ao envio" : "ao pedido";
  const marcas = useQuery({
    queryKey: ["marcas-empresa", empresa.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("marcas").select("id, nome").eq("empresa_id", empresa.id).order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
  const candidatos = ambiguo ? produtos.filter((p) => opcoes!.includes(p.id)) : produtos;

  async function salvar() {
    setSalvando(true);
    try {
      if (modo === "novo") {
        if (!nome.trim() || !sku.trim() || !marcaId || (linha && !cod.trim())) { toast.error("Preencha todos os campos obrigatórios."); return; }
        const ordem = produtos.filter((p) => p.marca_id === marcaId).length;
        const { data, error } = await supabase.from("produtos").insert({ nome: nome.trim(), cod: cod.trim(), codigo: sku.trim(), marca_id: marcaId, ordem }).select("id, nome, codigo, cod, estoque, marca_id").single();
        if (error) { toast.error(error.message.includes("row-level") ? "Só administradores podem cadastrar produtos." : error.message); return; }
        const marca = marcas.data?.find((m) => m.id === marcaId);
        await onPronto({ ...data, marca: marca?.nome ?? "", empresa_id: empresa.id });
        toast.success("Produto cadastrado");
      } else {
        const produto = produtos.find((p) => p.id === existenteId);
        if (!produto) { toast.error("Escolha o produto."); return; }
        if (linha && !ambiguo && produto.cod !== linha.cod) {
          const { error } = await supabase.from("produtos").update({ cod: linha.cod }).eq("id", produto.id);
          if (error) { toast.error(error.message.includes("row-level") ? "Só administradores podem editar produtos." : error.message); return; }
          toast.success("COD vinculado ao produto");
        }
        await onPronto(linha && !ambiguo ? { ...produto, cod: linha.cod } : produto);
      }
    } finally { setSalvando(false); }
  }

  const corBg = tipo === "full" ? "bg-dashboard-amber-soft border-dashboard-amber/45" : "bg-dashboard-green-soft border-dashboard-green/45";
  const corTx = tipo === "full" ? "text-dashboard-amber" : "text-dashboard-green";
  const sel = "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const titulo = ambiguo ? "Escolha o produto correto" : modo === "novo" ? "Cadastrar novo produto" : "Vincular a um cadastro existente";
  const sub = ambiguo ? "Mais de um produto tem esse código." : linha ? "Este item do PDF não foi encontrado no cadastro." : `Novo produto da ${empresa.nome}.`;

  return (
    <div className={overlay} role="dialog" aria-modal="true" aria-labelledby="titulo-modal">
      <div className={`${caixa} max-w-2xl p-6 sm:p-8`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-foreground ${tipo === "full" ? "bg-dashboard-amber-icon" : "bg-dashboard-green-icon"}`}><PackagePlus className="h-7 w-7" /></div>
          <div className="flex-1"><h2 id="titulo-modal" className="font-display text-2xl font-semibold text-foreground">{titulo}</h2><p className="text-sm text-muted-foreground">{sub}{restantes > 0 ? ` Faltam mais ${restantes}.` : ""}</p></div>
          <Button variant="ghost" size="icon" onClick={onFechar} aria-label="Fechar"><X className="h-5 w-5" /></Button>
        </div>

        {linha && (
          <div className={`mt-6 flex gap-4 rounded-md border p-4 ${corBg}`}>
            <FileText className={`h-6 w-6 shrink-0 ${corTx}`} />
            <div><p className={`text-xs font-semibold ${corTx}`}>Item identificado no PDF</p><p className="font-medium text-foreground">{linha.nome}</p><p className="text-xs text-muted-foreground">COD: {linha.cod} · Quantidade: {linha.quantidade}</p></div>
          </div>
        )}

        {modo === "novo" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm text-foreground sm:col-span-2">Nome do produto *<Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-10" /></label>
            <label className="grid gap-1 text-sm text-foreground">COD do fornecedor {linha ? "*" : ""}<Input value={cod} onChange={(e) => setCod(e.target.value)} className="h-10" /></label>
            <label className="grid gap-1 text-sm text-foreground">SKU interno *<Input value={sku} placeholder="Informe o SKU" onChange={(e) => setSku(e.target.value)} className="h-10" /></label>
            <label className="grid gap-1 text-sm text-foreground">Empresa *<select disabled className={sel}><option className="bg-background">{empresa.nome}</option></select></label>
            <label className="grid gap-1 text-sm text-foreground">Marca *<select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} className={sel}><option value="" className="bg-background">Selecione a marca</option>{(marcas.data ?? []).map((m) => <option key={m.id} value={m.id} className="bg-background">{m.nome}</option>)}</select></label>
          </div>
        ) : (
          <label className="mt-5 grid gap-1 text-sm text-foreground">Produto já cadastrado *
            <select value={existenteId} onChange={(e) => setExistenteId(e.target.value)} className={sel}><option value="" className="bg-background">Selecione o produto</option>{candidatos.map((p) => <option key={p.id} value={p.id} className="bg-background">{p.marca} · {p.nome} {p.codigo ? `(SKU ${p.codigo})` : ""}</option>)}</select>
            {linha && !ambiguo && <span className="text-xs text-muted-foreground">O COD {linha.cod} será gravado nesse produto.</span>}
          </label>
        )}

        {!ambiguo && linha && (
          <button type="button" onClick={() => setModo(modo === "novo" ? "vincular" : "novo")} className={`mt-5 inline-flex items-center gap-2 text-sm underline underline-offset-4 ${corTx}`}>
            <Link2 className="h-4 w-4" />{modo === "novo" ? "O produto já existe? Vincular a um cadastro existente" : "Cadastrar como novo produto"}
          </button>
        )}

        <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">O produto será adicionado {destino}. O estoque só muda ao {tipo === "full" ? "confirmar o envio" : "confirmar o recebimento"}.</p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onFechar}>{linha ? "Agora não" : "Cancelar"}</Button>
          <Button onClick={salvar} disabled={salvando} className="gerenciar-primary">{modo === "novo" ? `Cadastrar e adicionar ${destino}` : `Adicionar ${destino}`}</Button>
        </div>
      </div>
    </div>
  );
}
