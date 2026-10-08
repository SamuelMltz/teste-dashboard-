import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function BotaoImportarPdf({ rotulo, onArquivo }: { rotulo: string; onArquivo: (f: File) => Promise<void> }) {
  const ref = useRef<HTMLInputElement>(null);
  const [lendo, setLendo] = useState(false);
  return (
    <>
      <input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setLendo(true);
        try { await onArquivo(f); }
        catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível importar o PDF."); }
        finally { setLendo(false); if (ref.current) ref.current.value = ""; }
      }} />
      <Button type="button" variant="outline" disabled={lendo} onClick={() => ref.current?.click()} className="gap-2 border-section/60 text-section"><Upload className="h-4 w-4" />{lendo ? "Lendo PDF…" : rotulo}</Button>
    </>
  );
}
