import { useEffect, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { brParaYmd, ymdParaBr } from "@/lib/datas";

/** Campo de data DD/MM/AAAA: aceita só dia/mês (completa o ano atual) ou escolha no calendário. */
export function CampoData({ valor, onSalvar, disabled, permitirVazio = false }: { valor: string | null; onSalvar: (ymd: string | null) => unknown; disabled?: boolean; permitirVazio?: boolean }) {
  const [texto, setTexto] = useState(ymdParaBr(valor));
  const [aberto, setAberto] = useState(false);
  useEffect(() => { setTexto(ymdParaBr(valor)); }, [valor]);

  function confirmar() {
    if (!texto.trim()) {
      if (permitirVazio) { if (valor) void onSalvar(null); } else setTexto(ymdParaBr(valor));
      return;
    }
    const ymd = brParaYmd(texto);
    if (!ymd) { toast.error("Data inválida. Use DD/MM ou DD/MM/AAAA."); setTexto(ymdParaBr(valor)); return; }
    setTexto(ymdParaBr(ymd));
    if (ymd !== valor) void onSalvar(ymd);
  }

  const selecionada = valor ? new Date(Number(valor.slice(0, 4)), Number(valor.slice(5, 7)) - 1, Number(valor.slice(8, 10))) : undefined;

  return (
    <div className="flex items-center gap-1">
      <Input value={texto} disabled={disabled} placeholder="DD/MM" inputMode="numeric" maxLength={10} aria-label="Data (DD/MM/AAAA)" className="w-32 text-sm text-foreground"
        onChange={(e) => setTexto(e.target.value)} onBlur={confirmar} onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()} />
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label="Abrir calendário"><CalendarIcon className="h-4 w-4" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selecionada} defaultMonth={selecionada ?? new Date()} className="pointer-events-auto p-3"
            onSelect={(d) => {
              if (!d) return;
              const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
              setAberto(false); setTexto(ymdParaBr(ymd));
              if (ymd !== valor) void onSalvar(ymd);
            }} />
        </PopoverContent>
      </Popover>
    </div>
  );
}
