import { useState } from "react";
import { Info } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Item = { sku: string; nome: string; vendas: number | null };

/** Top 3 por unidades vendidas em 30 dias; "menos" considera só produtos com dados. */
export function rankingVendas(itens: Item[], tipo: "mais" | "menos") {
  const com = itens.filter((i) => i.vendas !== null) as (Item & { vendas: number })[];
  return [...com].sort((a, b) => (tipo === "mais" ? b.vendas - a.vendas : a.vendas - b.vendas)).slice(0, 3);
}

export function RankingVendas({ itens }: { itens: Item[] }) {
  const [tipo, setTipo] = useState<"" | "mais" | "menos">("");
  const top = tipo ? rankingVendas(itens, tipo) : [];
  return (
    <section className="estoque-card mt-5 rounded-md border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold text-foreground">Ranking · unidades vendidas em 30 dias</h2>
        <Select value={tipo} onValueChange={(v) => setTipo(v as "mais" | "menos")}>
          <SelectTrigger className="h-10 w-64"><SelectValue placeholder="Escolha o ranking" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mais">3 mais vendidos</SelectItem>
            <SelectItem value="menos">3 menos vendidos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Info className="h-4 w-4" />Veja os três produtos com mais ou menos unidades vendidas em 30 dias, conforme a marca selecionada.</p>
      {tipo && (top.length === 0 ? (
        <p className="mt-5 text-center text-muted-foreground">Sem dados de vendas. Sincronize o Mercado Livre.</p>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-[3fr_2fr]">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.map((t) => ({ nome: t.nome.slice(0, 22), vendas: t.vendas }))} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="nome" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} un.`, "Vendas"]} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <Bar dataKey="vendas" fill="var(--graficos-vendas)" radius={[4, 4, 0, 0]}><LabelList dataKey="vendas" position="top" fill="var(--foreground)" /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ol className="flex flex-col justify-center gap-3">
            {top.map((t, i) => (
              <li key={t.sku + t.nome} className="flex items-center gap-3 rounded-md border border-border p-3">
                <span className="font-display text-2xl font-bold text-section">{i + 1}º</span>
                <div className="min-w-0 flex-1"><p className="truncate text-foreground">{t.nome}</p><p className="text-xs text-muted-foreground">{t.sku || "—"}</p></div>
                <span className="font-display text-xl font-semibold text-foreground">{t.vendas} <span className="text-xs text-muted-foreground">un.</span></span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
