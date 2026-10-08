import { Building2 } from "lucide-react";
import vivalleLogo from "@/assets/logos/vivalle-refined.png";
import luminartechLogo from "@/assets/logos/luminartech-refined.png";
import vitrineLogo from "@/assets/logos/vitrine-refined.png";

const LOGOS: Record<string, string> = {
  vivalle: vivalleLogo,
  luminartech: luminartechLogo,
  vitrine: vitrineLogo,
};

export function AvatarEmpresa({ slug, nome }: { slug: string; nome: string }) {
  const logo = LOGOS[slug];
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
        {logo ? (
          <img src={logo} alt={`Logo ${nome}`} className="h-full w-full object-cover" />
        ) : (
          <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        )}
      </span>
      <span className="max-w-[9rem] truncate font-display text-base font-semibold text-foreground sm:max-w-[16rem] sm:text-lg">{nome}</span>
    </div>
  );
}
