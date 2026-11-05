import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileDown, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BarraEmpresa } from "@/components/BarraEmpresa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";
import { gerarPdfEtiquetas, totalPaginas, type ProdutoEtiqueta } from "@/lib/etiquetas";

export const Route = createFileRoute("/_authenticated/etiquetar")({
  head: () => ({ meta: [
    { title: "Etiquetar — Etiquetas de caixas" },
    { name: "description", content: "Monte um PDF com nome e SKU dos produtos para identificar as caixas." },
    { property: "og:title", content: "Etiquetar — Etiquetas de caixas" },
    { property: "og:description", content: "Monte um PDF com nome e SKU dos produtos para identificar as caixas." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Etiquetar,
});

type Item = { id: string; etiquetado: boolean; full?: boolean; copias: number };
const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Etiquetar() {
  const empresa = useEmpresaObrigatoria();
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);
  const chave = empresa && userId ? `etiquetas:${userId}:${empresa.id}` : null;

  const { data: produtos, isError } = useQuery({
    queryKey: ["etiquetas-produtos", empresa?.id],
    enabled: !!empresa,
    queryFn: async () => {
      const { data, error } = await supabase.from("produtos").select("id, nome, codigo, marcas!inner(nome, empresa_id)").eq("marcas.empresa_id", empresa!.id).order("nome");
      if (error) throw error;
      return (data ?? []).map((p) => ({ id: p.id, nome: p.nome, sku: p.codigo, marca: (p.marcas as unknown as { nome: string }).nome }));
    },
  });

  const [itens, setItens] = useState<Item[]>([]);
  const [carregado, setCarregado] = useState<string | null>(null);
  useEffect(() => {
    if (!chave) return;
    try { setItens(JSON.parse(localStorage.getItem(chave) ?? "[]")); } catch { setItens([]); }
    setCarregado(chave);
  }, [chave]);
  useEffect(() => { if (chave && carregado === chave) localStorage.setItem(chave, JSON.stringify(itens)); }, [itens, chave, carregado]);
  // Remove da seleção só os produtos que a consulta confirmou não existir mais.
  useEffect(() => { if (produtos) setItens((a) => a.filter((i) => produtos.some((p) => p.id === i.id))); }, [produtos]);

  const mapa = useMemo(() => new Map((produtos ?? []).map((p) => [p.id, p])), [produtos]);
  const lista: ProdutoEtiqueta[] = itens.flatMap((i) => { const p = mapa.get(i.id); return p ? [{ ...p, etiquetado: i.etiquetado, full: !!i.full, copias: i.copias }] : []; });
  let paginas = 0, erro = "";
  try { paginas = totalPaginas(lista); } catch (e) { erro = (e as Error).message; }

  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const disponiveis = (produtos ?? []).filter((p) => !itens.some((i) => i.id === p.id) && normalizar(`${p.nome} ${p.sku} ${p.marca}`).includes(normalizar(busca))).slice(0, 50);

  const atualizar = (id: string, mud: Partial<Item>) => setItens((a) => a.map((i) => (i.id === id ? { ...i, ...mud } : i)));

  async function gerar() {
    if (gerando || erro) return;
    setGerando(true);
    try { const n = await gerarPdfEtiquetas(lista); toast.success(`PDF com ${n} página(s) solicitado ao navegador.`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setGerando(false); }
  }

  return (
    <div className="relative min-h-screen bg-estoque-canvas">
      <div className="relative mx-auto max-w-5xl px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" asChild className="-ml-3 gap-2 text-muted-foreground"><Link to="/"><ArrowLeft className="h-4 w-4" />Voltar ao início</Link></Button><BarraEmpresa /></div>
        <header className="mt-7 flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md section-icon text-foreground"><Tags className="h-9 w-9" /></div><div><h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Etiquetar</h1><p className="mt-1 text-sm text-muted-foreground">Escolha os produtos, marque "Etiquetado" se quiser e defina as cópias. Imprima em A4 horizontal, escala 100%.</p></div></header>
        <div className="mt-5 h-1 w-16 rounded-full bg-section" />

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => { setBusca(""); setEscolhido(null); setAberto(true); }} className="gap-2"><Plus className="h-4 w-4" />Adicionar produto</Button>
          <Button variant="secondary" onClick={gerar} disabled={!!erro || gerando} className="gap-2"><FileDown className="h-4 w-4" />{gerando ? "Gerando..." : `Baixar PDF${paginas ? ` (${paginas} pág.)` : ""}`}</Button>
        </div>
        {isError && <p className="mt-3 text-sm text-destructive">Não foi possível conferir os cadastros. Tente recarregar.</p>}
        {erro && lista.length > 0 && <p className="mt-3 text-sm text-destructive">{erro}</p>}

        <div className="mt-5 divide-y divide-border rounded-md border border-border bg-card">
          {lista.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Nenhum produto na lista de etiquetas.</p>}
          {lista.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1"><p className="truncate font-medium text-foreground">{p.nome}</p><p className="text-xs text-muted-foreground">SKU {p.sku || "— sem SKU"} · {p.marca}</p></div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={!!p.etiquetado} onCheckedChange={(v) => atualizar(p.id, { etiquetado: v })} />Etiquetado</label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground"><Switch checked={!!p.full} onCheckedChange={(v) => atualizar(p.id, { full: v })} />Full</label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">Cópias<Input type="number" min={1} max={200} className="w-20" value={p.copias} onChange={(e) => atualizar(p.id, { copias: Number(e.target.value) })} /></label>
              <Button variant="ghost" size="icon" aria-label="Remover da lista" onClick={() => setItens((a) => a.filter((i) => i.id !== p.id))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Imprimir etiquetas não altera estoque, cadastro nem anúncios.</p>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar produto</DialogTitle></DialogHeader>
          <Input autoFocus placeholder="Buscar por nome, SKU ou marca" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div className="max-h-72 overflow-y-auto rounded-md border border-border">
            {disponiveis.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
            {disponiveis.map((p) => (
              <button key={p.id} type="button" onClick={() => setEscolhido(p.id)} className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${escolhido === p.id ? "bg-muted" : ""}`}>
                <span className="font-medium text-foreground">{p.nome}</span><span className="block text-xs text-muted-foreground">SKU {p.sku || "—"} · {p.marca}</span>
              </button>
            ))}
          </div>
          <Button disabled={!escolhido} onClick={() => { if (escolhido) setItens((a) => [...a, { id: escolhido, etiquetado: false, copias: 1 }]); setAberto(false); }}>Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
