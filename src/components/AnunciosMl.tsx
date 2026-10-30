import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SincronizarMl } from "@/components/SincronizarMl";
import { classeMargem, lucroAnuncio, matizMargem, type Percentuais } from "@/lib/promocoes";

const brl = (v: number | null) => v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AnunciosMl({ empresaId, pct }: { empresaId: string; pct: Percentuais | null }) {
  const [filtro, setFiltro] = useState("todos");
  const [busca, setBusca] = useState("");
  const [classe, setClasse] = useState("todas");
  const { data } = useQuery({
    queryKey: ["ml-anuncios", empresaId],
    queryFn: async () => {
      const [a, p] = await Promise.all([
        supabase.from("ml_anuncios").select("item_id, sku, titulo, preco, preco_original, em_promocao, atualizado_em").eq("empresa_id", empresaId),
        supabase.from("produtos").select("codigo, nome, preco_custo, marcas!inner(nome, empresa_id)").eq("marcas.empresa_id", empresaId),
      ]);
      return { anuncios: a.data ?? [], produtos: (p.data ?? []) as any[] };
    },
  });
  const linhas = useMemo(() => {
    const porSku = new Map((data?.produtos ?? []).map((p) => [String(p.codigo).trim().toUpperCase(), p]));
    const p0: Percentuais = pct ?? { imposto_pct: null, custo_fixo_pct: null, ads_pct: null };
    return (data?.anuncios ?? []).map((a) => {
      const prod = porSku.get(a.sku);
      const preco = a.preco == null ? null : Number(a.preco);
      const orig = a.preco_original == null ? null : Number(a.preco_original);
      const desconto = a.em_promocao && orig ? Math.round((1 - (preco ?? 0) / orig) * 1000) / 10 : 0;
      return { ...a, preco, orig, desconto, prod, res: lucroAnuncio(preco, prod?.preco_custo ?? null, p0) };
    }).sort((x, y) => Number(y.em_promocao) - Number(x.em_promocao));
  }, [data, pct]);
  const q = busca.trim().toLowerCase();
  const vis = linhas.filter((l) => (filtro === "todos" || (filtro === "promo") === l.em_promocao) && (classe === "todas" || classeMargem(l.res?.margem ?? null) === classe) && (!q || [l.titulo, l.sku, l.item_id].some((t) => t.toLowerCase().includes(q))));
  const emPromo = linhas.filter((l) => l.em_promocao).length;
  const ultima = linhas[0]?.atualizado_em;

  return (
    <section className="mt-6 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Produtos · Mercado Livre</h2>
          <p className="mt-1 text-sm text-muted-foreground">Anúncios ativos e se estão em promoção no ML. A margem é estimada pelo custo do cadastro e pelos % de Configurações.</p>
          <p className="mt-2 text-sm font-medium text-foreground">{emPromo} em promoção · {linhas.length - emPromo} preço normal{ultima ? ` · atualizado ${new Date(ultima).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</p>
        </div>
        <SincronizarMl empresaId={empresaId} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Select value={filtro} onValueChange={setFiltro}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os anúncios</SelectItem><SelectItem value="promo">Em promoção</SelectItem><SelectItem value="normal">Preço normal</SelectItem></SelectContent></Select>
        <Select value={classe} onValueChange={setClasse}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as margens</SelectItem>{["Excelente","Bom","Baixo","Ruim","Crítico","Sem valores"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
        <Input className="max-w-xs" placeholder="Produto, SKU ou anúncio" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
            <tr><th className="px-4 py-3 font-medium">Marca</th><th className="px-4 py-3 font-medium">Produto / SKU / anúncio</th><th className="px-4 py-3 font-medium">Promoção no ML</th><th className="px-4 py-3 font-medium">Preço final</th><th className="px-4 py-3 font-medium">Custo</th><th className="px-4 py-3 font-medium">Lucro estimado</th><th className="px-4 py-3 font-medium">Margem de lucro</th></tr>
          </thead>
          <tbody>
            {vis.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">{linhas.length ? "Nenhum anúncio neste filtro." : "Sincronize o Mercado Livre para trazer os anúncios."}</td></tr>}
            {vis.map((l) => {
              const h = l.res ? matizMargem(l.res.margem) : null;
              return (
                <tr key={l.item_id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{l.prod?.marcas?.nome ?? "—"}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{l.prod?.nome ?? l.titulo}</p><p className="text-xs text-muted-foreground">{l.sku || "Sem SKU"} · {l.item_id}</p></td>
                  <td className="px-4 py-3">{l.em_promocao
                    ? <span className="rounded-full border border-dashboard-green/40 bg-dashboard-green/15 px-2.5 py-1 text-xs font-bold text-dashboard-green">ATIVA · {l.desconto.toLocaleString("pt-BR")}% OFF</span>
                    : <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">Preço normal</span>}</td>
                  <td className="px-4 py-3"><p className="font-semibold text-foreground">{brl(l.preco)}</p>{l.em_promocao && <p className="text-xs text-muted-foreground line-through">{brl(l.orig)}</p>}</td>
                  <td className="px-4 py-3 text-foreground">{brl(l.prod?.preco_custo ?? null)}</td>
                  <td className="px-4 py-3" style={h != null ? { color: `hsl(${h} 75% 55%)` } : undefined}>{l.res ? brl(l.res.lucro) : <span className="text-muted-foreground">Incompleto</span>}</td>
                  <td className="px-4 py-3">{l.res
                    ? <span className="rounded-md px-2.5 py-1 font-bold" style={{ color: `hsl(${h} 75% 60%)`, backgroundColor: `hsl(${h} 75% 45% / 0.15)` }}>{l.res.margem.toLocaleString("pt-BR")}% · {classeMargem(l.res.margem)}</span>
                    : <span className="text-xs text-muted-foreground">{l.prod ? "Custo não informado no cadastro" : "SKU não cadastrado"}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
