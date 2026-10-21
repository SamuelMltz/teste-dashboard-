import { calcularCobertura } from "@/lib/cobertura-full";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const num = (n: number, d = 0) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });

export function IndicadorCoberturaFull({ full, vendasFull }: { full: number | null; vendasFull: number | null }) {
  const c = calcularCobertura(full, vendasFull);
  const cor = c.matiz === null ? "var(--muted-foreground)" : `hsl(${c.matiz} 70% 48%)`;
  const titulo = c.status === "urgente" ? `URGENTE · ${c.texto}` : c.texto;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-44 cursor-default">
            <span className="mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wide" style={{ color: cor, border: `1px solid ${cor}` }}>{c.selo}</span>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full transition-all" style={{ width: `${c.preenchimento}%`, background: cor }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{titulo}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent className="text-xs">
          <p>Estoque Full disponível: {full === null ? "—" : num(full)}</p>
          <p>Vendas Full em 30 dias: {vendasFull === null ? "—" : num(vendasFull)}</p>
          <p>Média diária: {c.mediaDiaria === null ? "—" : num(c.mediaDiaria, 2)}</p>
          <p>Cobertura: {c.dias === null ? "—" : `${num(c.dias, 1)} dias`}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
