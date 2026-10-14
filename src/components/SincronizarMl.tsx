import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { RefreshCw, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { statusMl, sincronizarFullMl, urlConectarMl } from "@/lib/ml.functions";
import { formatarDataHora } from "@/lib/sincronizar-ml-format";

export function SincronizarMl({ empresaId }: { empresaId: string }) {
  const qc = useQueryClient();
  const status = useServerFn(statusMl);
  const conectar = useServerFn(urlConectarMl);
  const sincronizar = useServerFn(sincronizarFullMl);
  const [ocupado, setOcupado] = useState(false);
  const { data } = useQuery({ queryKey: ["ml-status", empresaId], queryFn: () => status({ data: { empresaId } }) });

  async function onConectar() {
    setOcupado(true);
    try {
      const { url } = await conectar({ data: { empresaId } });
      window.open(url, "_blank");
    } catch (e: any) { toast.error(e.message); } finally { setOcupado(false); }
  }
  async function onSync() {
    setOcupado(true);
    try {
      const r = await sincronizar({ data: { empresaId } });
      if (r.ok) toast.success(`Estoque Full atualizado: ${r.itens} produtos, ${r.unidades} unidades.`);
      else toast.error(r.erro);
      qc.invalidateQueries({ queryKey: ["ml-status", empresaId] });
      qc.invalidateQueries({ queryKey: ["ml-estoque", empresaId] });
    } finally { setOcupado(false); }
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
      <p className="text-sm text-muted-foreground">
        Atualização: {data?.sincronizadoEm ? formatarDataHora(data.sincronizadoEm) : "Ainda não sincronizado"}
      </p>
      {data?.expiraEm && (
        <p className="text-xs text-muted-foreground">Conexão válida até {formatarDataHora(data.expiraEm)}</p>
      )}
      {data?.conectado ? (
        <Button size="sm" variant="outline" onClick={onSync} disabled={ocupado} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${ocupado ? "animate-spin" : ""}`} />Sincronizar estoque Full
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={onConectar} disabled={ocupado || !data} className="gap-2">
          <Link2 className="h-4 w-4" />Conectar Mercado Livre
        </Button>
      )}
    </div>
  );
}
