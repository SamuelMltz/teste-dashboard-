import { useState } from "react";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { gerarPdfEstoque, montarRelatorio } from "@/lib/relatorio-estoque";

/** Gera o PDF de estoque com os dados já salvos (sem sincronizar nem alterar nada). */
export function BotaoPdfEstoque({ empresaId, empresaNome, marcaId, marcaNome }: { empresaId: string; empresaNome: string; marcaId?: string; marcaNome?: string }) {
  const [gerando, setGerando] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function gerar() {
    setGerando(true); setLink(null);
    try {
      let q = supabase.from("produtos").select("codigo, nome, estoque, preco_custo, marca_id, marcas!inner(empresa_id)").eq("marcas.empresa_id", empresaId).order("nome");
      if (marcaId) q = q.eq("marca_id", marcaId);
      const [{ data: prods, error: e1 }, { data: full, error: e2 }] = await Promise.all([
        q, supabase.from("ml_estoque_full").select("sku, quantidade").eq("empresa_id", empresaId),
      ]);
      if (e1 || e2) throw new Error("Só administradores podem gerar este relatório.");
      const r = montarRelatorio(prods ?? [], full ?? []);
      const url = await gerarPdfEstoque(empresaNome, marcaNome ?? "Todas as marcas", r);
      setLink(url);
      const a = document.createElement("a"); a.href = url; a.download = `estoque-${empresaNome}${marcaNome ? `-${marcaNome}` : ""}.pdf`; a.click();
    } catch (e) { toast.error((e as Error).message); }
    finally { setGerando(false); }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" onClick={gerar} disabled={gerando} className="gap-2"><FileDown className="h-4 w-4" />{gerando ? "Gerando..." : "Gerar PDF"}</Button>
      {link && <a href={link} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground underline">Abrir PDF</a>}
    </div>
  );
}
