import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarEmpresa } from "@/components/AvatarEmpresa";
import { definirEmpresaAtual, useEmpresaAtual } from "@/lib/empresa-atual";

/** Foto da empresa selecionada + "Trocar empresa", igual ao início. */
export function BarraEmpresa() {
  const empresa = useEmpresaAtual();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  if (!empresa) return null;
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-4">
      <AvatarEmpresa key={empresa.slug} slug={empresa.slug} nome={empresa.nome} />
      <Button variant="outline" size="sm" className="shrink-0 gap-2 px-2 sm:px-3" aria-label="Trocar empresa" title="Trocar empresa"
        onClick={() => { queryClient.clear(); definirEmpresaAtual(null); navigate({ to: "/" }); }}>
        <ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Trocar empresa</span>
      </Button>
    </div>
  );
}
