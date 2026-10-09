import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, PackagePlus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { calcularReposicao, referenciaLista, saldoPendente, type CalculoReposicao, type Cobertura } from "@/lib/lista-compras";
import { gerarPdfLista } from "@/lib/pdf-export";
import { hojeSP, ymdParaBr } from "@/lib/datas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type PedidoAberto = { id: string; numero: number; rascunho: boolean; pendente: number };
type Linha = { id: string; sku: string; cod: string; nome: string; marca: string; marcaOrdem: number; fisico: number; minimo: number; pendente: number; pedidos: PedidoAberto[]; calc: CalculoReposicao };
type Dados = { empresa: { id: string; slug: string; nome: string; cnpj: string; atencao: number; alvo: number }; linhas: Linha[] };

async function carregar(slug: string): Promise<Dados> {
  const { data: e, error: e1 } = await db.from("empresas").select("id, slug, nome, cnpj, reposicao_atencao_pct, reposicao_alvo_pct").eq("slug", slug).single();
  if (e1) throw e1;
  const [prodRes, itensRes] = await Promise.all([
    supabase.from("produtos").select("id, nome, codigo, cod, estoque, estoque_minimo, ordem, marcas!inner(nome, ordem, empresa_id)").eq("marcas.empresa_id", e.id).order("ordem"),
    db.from("pedido_itens").select("produto_id, quantidade, quantidade_recebida, pedidos!inner(id, numero, status, rascunho)").eq("pedidos.status", "planejado"),
  ]);
  if (prodRes.error) throw prodRes.error;
  if (itensRes.error) throw itensRes.error;
  const cfg = { atencaoPct: e.reposicao_atencao_pct, alvoPct: e.reposicao_alvo_pct };
  const abertos = new Map<string, PedidoAberto[]>();
  for (const i of itensRes.data ?? []) {
    const p = Array.isArray(i.pedidos) ? i.pedidos[0] : i.pedidos;
    const pendente = saldoPendente(i, p.status);
    if (!pendente) continue;
    abertos.set(i.produto_id, [...(abertos.get(i.produto_id) ?? []), { id: p.id, numero: p.numero, rascunho: p.rascunho, pendente }]);
  }
  const linhas = (prodRes.data ?? []).map((p) => {
    const m = Array.isArray(p.marcas) ? p.marcas[0] : p.marcas;
    const pedidos = abertos.get(p.id) ?? [];
    const pendente = pedidos.reduce((s, x) => s + x.pendente, 0);
    return { id: p.id, sku: p.codigo, cod: p.cod, nome: p.nome, marca: m?.nome ?? "", marcaOrdem: m?.ordem ?? 0, fisico: p.estoque, minimo: p.estoque_minimo, pendente, pedidos, calc: calcularReposicao(p.estoque, p.estoque_minimo, pendente, cfg) };
  }).sort((a, b) => a.marcaOrdem - b.marcaOrdem);
  return { empresa: { id: e.id, slug: e.slug, nome: e.nome, cnpj: e.cnpj, atencao: cfg.atencaoPct, alvo: cfg.alvoPct }, linhas };
}

const ABAS: [Cobertura | "todos" | "sem-minimo", string][] = [["a-comprar", "A comprar"], ["parcial", "Cobertura parcial"], ["coberto", "Em pedidos"], ["sem-minimo", "Mínimo não definido"], ["todos", "Todos"]];
const cod4 = (n: number) => `#${String(n).padStart(4, "0")}`;

export function ReposicaoFisica({ empresaSlug, titulo = "Lista de compras" }: { empresaSlug: string; titulo?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const chaveQuery = ["reposicao-fisica", empresaSlug];
  const { data, isLoading, error } = useQuery({ queryKey: chaveQuery, queryFn: () => carregar(empresaSlug), enabled: !!empresaSlug });
  const [aba, setAba] = useState<(typeof ABAS)[number][0]>("a-comprar");
  const [ajustes, setAjustes] = useState<Record<string, number>>({});
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set());
  const [gerando, setGerando] = useState(false);
  const [config, setConfig] = useState(false);
  const chaveGeracao = useRef<string>(crypto.randomUUID());

  const linhas = data?.linhas ?? [];
  const qtd = (l: Linha) => ajustes[l.id] ?? l.calc.sugestao;
  const selecionado = (l: Linha) => !desmarcados.has(l.id) && qtd(l) > 0 && l.calc.situacao !== "sem-minimo";
  const visiveis = useMemo(() => linhas.filter((l) =>
    aba === "todos" ? true : aba === "sem-minimo" ? l.calc.situacao === "sem-minimo" : l.calc.cobertura === aba), [linhas, aba]);
  const escolhidos = linhas.filter((l) => selecionado(l) && (l.calc.cobertura === "a-comprar" || l.calc.cobertura === "parcial" || ajustes[l.id] !== undefined));
  const contagem = (a: (typeof ABAS)[number][0]) => a === "todos" ? linhas.length : a === "sem-minimo" ? linhas.filter((l) => l.calc.situacao === "sem-minimo").length : linhas.filter((l) => l.calc.cobertura === a).length;

  function grupos() {
    const m = new Map<string, { sku: string; cod: string; nome: string; quantidade: number }[]>();
    for (const l of escolhidos) m.set(l.marca, [...(m.get(l.marca) ?? []), { sku: l.sku, cod: l.cod, nome: l.nome, quantidade: qtd(l) }]);
    return Array.from(m, ([marca, itens]) => ({ marca, itens }));
  }

  async function exportar() {
    if (!data || !escolhidos.length) { toast.error("Nenhum produto com quantidade a comprar."); return; }
    const ref = referenciaLista(data.empresa.slug);
    await gerarPdfLista({ referencia: ref, empresa: data.empresa, data: ymdParaBr(hojeSP()), grupos: grupos(), arquivo: `${ref.toLowerCase()}.pdf` });
  }

  async function gerar() {
    if (!data || gerando) return;
    if (!escolhidos.length) { toast.error("Selecione produtos com quantidade a comprar."); return; }
    const g = grupos();
    if (!confirm(`Gerar ${g.length} pedido(s) em rascunho, um por marca (${g.map((x) => x.marca).join(", ")})?\n\nNada é enviado ao fornecedor e o estoque não muda.`)) return;
    setGerando(true);
    const { data: r, error: e } = await db.rpc("gerar_pedidos_reposicao", {
      _empresa_id: data.empresa.id, _chave: chaveGeracao.current, _lista_ref: referenciaLista(data.empresa.slug),
      _itens: escolhidos.map((l) => ({ produto_id: l.id, quantidade: qtd(l), sugestao: l.calc.sugestao })),
    });
    setGerando(false);
    if (e) { toast.error(e.message); return; }
    chaveGeracao.current = crypto.randomUUID();
    setAjustes({}); setDesmarcados(new Set());
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["reposicao-fisica"] }), queryClient.invalidateQueries({ queryKey: ["pedidos"] })]);
    const pedidos = (r?.pedidos ?? []) as { id: string; numero: number; marca: string }[];
    if (!pedidos.length) { toast.info("Os pedidos abertos já cobrem a necessidade. Nenhum pedido novo foi criado."); return; }
    toast.success(`${pedidos.length} pedido(s) criados: ${pedidos.map((p) => `${cod4(p.numero)} ${p.marca}`).join(", ")}${r.ajustados ? ` · ${r.ajustados} quantidade(s) reduzidas por pedidos feitos enquanto a lista estava aberta` : ""}`);
    if (pedidos.length === 1 && pedidos[0]) navigate({ to: "/pedidos/$id", params: { id: pedidos[0].id } });
  }

  async function salvarConfig(campo: "reposicao_atencao_pct" | "reposicao_alvo_pct", valor: number) {
    if (!data || !Number.isFinite(valor)) return;
    const { error: e } = await db.from("empresas").update({ [campo]: Math.round(valor) }).eq("id", data.empresa.id);
    if (e) { toast.error("Não foi possível salvar (100% a 500% para atenção, 100% a 1000% para alvo; apenas administradores)."); return; }
    await queryClient.invalidateQueries({ queryKey: ["reposicao-fisica"] });
  }

  return (
    <section className="estoque-card mt-5 rounded-md border border-border p-5" aria-label={titulo}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">{titulo}</h2>
          <p className="text-sm text-muted-foreground">Estoque físico e mínimos cadastrados{data ? ` · alvo ${data.empresa.alvo}% do mínimo, atenção até ${data.empresa.atencao}%` : ""}. Pedidos em aberto (rascunhos e confirmados) já são descontados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" className="gap-2 text-section" onClick={() => setConfig((v) => !v)}><Settings2 className="h-4 w-4" />Percentuais</Button>
          <Button variant="outline" className="gap-2 border-section/60 text-section" onClick={exportar} disabled={!escolhidos.length}><Download className="h-4 w-4" />Exportar lista em PDF</Button>
          <Button className="gap-2 bg-section text-primary-foreground hover:bg-section/90" onClick={gerar} disabled={gerando || !escolhidos.length}><PackagePlus className="h-4 w-4" />{gerando ? "Gerando…" : "Gerar pedidos por marca"}</Button>
        </div>
      </div>

      {config && data && (
        <div className="mt-4 flex flex-wrap gap-4 rounded-md border border-border p-3 text-sm">
          <label className="grid gap-1 text-muted-foreground">Atenção até (% do mínimo)<Input type="number" min={100} max={500} defaultValue={data.empresa.atencao} className="w-32" onBlur={(e) => void salvarConfig("reposicao_atencao_pct", Number(e.target.value))} /></label>
          <label className="grid gap-1 text-muted-foreground">Estoque-alvo (% do mínimo)<Input type="number" min={100} max={1000} defaultValue={data.empresa.alvo} className="w-32" onBlur={(e) => void salvarConfig("reposicao_alvo_pct", Number(e.target.value))} /></label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">{ABAS.map(([v, r]) => (
        <Button key={v} variant="outline" size="sm" onClick={() => setAba(v)} aria-pressed={aba === v} className={aba === v ? "border-section bg-section-soft text-section" : ""}>{r} ({contagem(v)})</Button>
      ))}</div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>{["", "SKU", "Produto", "Marca", "Físico", "Mínimo", "Em pedidos", "Comprar", "Justificativa"].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">Carregando…</td></tr>
              : error ? <tr><td colSpan={9} className="py-10 text-center text-dashboard-red">Não foi possível carregar a reposição.</td></tr>
              : visiveis.length === 0 ? <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">Nenhum produto nesta situação.</td></tr>
              : visiveis.map((l) => {
                const semMin = l.calc.situacao === "sem-minimo";
                const manual = ajustes[l.id] !== undefined && ajustes[l.id] !== l.calc.sugestao;
                return (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2"><Checkbox aria-label={`Selecionar ${l.nome}`} disabled={semMin || qtd(l) <= 0} checked={selecionado(l)} onCheckedChange={(v) => setDesmarcados((s) => { const n = new Set(s); if (v) n.delete(l.id); else n.add(l.id); return n; })} /></td>
                    <td className="px-3 py-2 text-foreground">{l.sku || "—"}</td>
                    <td className="px-3 py-2 text-foreground">{l.nome}</td>
                    <td className="px-3 py-2 text-muted-foreground">{l.marca}</td>
                    <td className={`px-3 py-2 font-semibold ${l.calc.situacao === "abaixo" ? "text-dashboard-red" : l.calc.situacao === "proximo" ? "text-dashboard-amber" : "text-foreground"}`}>{l.fisico}</td>
                    <td className="px-3 py-2 text-foreground">{semMin ? "—" : l.minimo}</td>
                    <td className="px-3 py-2 text-foreground">
                      {l.pendente}
                      {l.pedidos.length > 0 && <span className="mt-0.5 flex flex-wrap gap-1 text-xs">{l.pedidos.map((p) => <Link key={p.id} to="/pedidos/$id" params={{ id: p.id }} className="text-section underline-offset-2 hover:underline">{cod4(p.numero)}{p.rascunho ? " rascunho" : ""}</Link>)}</span>}
                    </td>
                    <td className="px-3 py-2">{semMin ? <span className="text-muted-foreground">—</span> : (
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} value={qtd(l)} aria-label={`Quantidade a comprar de ${l.nome}`} className="h-9 w-20" onChange={(e) => setAjustes((a) => ({ ...a, [l.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
                        {manual && <button type="button" className="text-xs text-section hover:underline" onClick={() => setAjustes((a) => { const n = { ...a }; delete n[l.id]; return n; })}>Manual · desfazer</button>}
                      </div>
                    )}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{l.calc.justificativa}{manual ? ` · ajustado para ${qtd(l)}` : ""}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{escolhidos.length} produto(s) selecionados · {escolhidos.reduce((s, l) => s + qtd(l), 0)} unidades. A quantidade é recalculada no servidor antes de criar os pedidos. Exportar ou gerar não altera o estoque.</p>
    </section>
  );
}
