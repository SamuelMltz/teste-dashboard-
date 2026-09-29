import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Ponto = { mes: string; faturamento: number };

// Recharts depende de medidas do navegador, então só renderiza depois da hidratação.
export function GraficoFaturamento({
  dados,
  accent,
}: {
  dados: Ponto[];
  accent: string;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  if (!montado) {
    return <div className="h-64 animate-pulse rounded-lg bg-muted/40" />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="corFaturamento" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
          <XAxis
            dataKey="mes"
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "currentColor", fontSize: 12 }}
            className="text-muted-foreground"
            axisLine={false}
            tickLine={false}
            width={70}
            tickFormatter={(v: number) => `R$ ${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(v) => [
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 0,
              }).format(Number(v)),
              "Faturamento",
            ]}
            contentStyle={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--card-foreground)",
            }}
            labelStyle={{ color: "var(--muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="faturamento"
            stroke={accent}
            strokeWidth={2.5}
            fill="url(#corFaturamento)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
