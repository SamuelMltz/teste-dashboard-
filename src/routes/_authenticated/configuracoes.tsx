import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Bell, Building2, Info, Link2, Settings, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaObrigatoria } from "@/lib/use-empresa-obrigatoria";
import { BarraEmpresa } from "@/components/BarraEmpresa";
import { SincronizarMl } from "@/components/SincronizarMl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Dashboard" },
      { name: "description", content: "Perfil, dados da empresa, percentuais de lucro, avisos e integração com o Mercado Livre." },
      { property: "og:title", content: "Configurações — Dashboard" },
      { property: "og:description", content: "Perfil, dados da empresa, percentuais de lucro, avisos e integração com o Mercado Livre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Configuracoes,
});

function Cartao({ Icon, titulo, info, children }: { Icon: typeof User; titulo: string; info: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground"><Icon className="h-5 w-5" />{titulo}</h2>
      <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" />{info}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}
const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label className="text-sm text-muted-foreground">{rotulo}</Label>{children}</div>;

function Configuracoes() {
  const empresa = useEmpresaObrigatoria();
  if (!empresa) return null;
  return (
    <div className="min-h-screen bg-estoque-canvas">
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="ghost" asChild className="-ml-3 gap-2 text-muted-foreground"><Link to="/"><ArrowLeft className="h-4 w-4" />Voltar ao início</Link></Button><BarraEmpresa /></div>
        <header className="mt-7 flex items-center gap-4">
          <div className="section-icon flex h-14 w-14 shrink-0 items-center justify-center rounded-md"><Settings className="h-7 w-7" /></div>
          <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">Configurações</h1>
        </header>
        <div className="mt-7 space-y-5">
          <Perfil />
          <DadosEmpresa empresaId={empresa.id} />
          <Preferencias />
          <Cartao Icon={Link2} titulo="Integração Mercado Livre" info="Cada empresa tem sua própria conta e sincronização. Antes de autorizar, entre no Mercado Livre com a conta da empresa abaixo.">
            <div className="rounded-md border border-border p-4">
              <p className="mb-3 font-semibold text-foreground">{empresa.nome}</p>
              <SincronizarMl empresaId={empresa.id} />
            </div>
          </Cartao>
        </div>
      </div>
    </div>
  );
}

function Perfil() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [podeSenha, setPodeSenha] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => {
    const u = data.user; if (!u) return;
    setNome(u.user_metadata?.["full_name"] ?? u.user_metadata?.["name"] ?? ""); setEmail(u.email ?? "");
    setPodeSenha((u.identities ?? []).some((i) => i.provider === "email"));
  }); }, []);
  async function salvar() {
    const { error } = await supabase.auth.updateUser({ data: { full_name: nome.trim() }, ...(senha ? { password: senha } : {}) });
    if (error) toast.error(error.message); else { toast.success("Perfil salvo."); setSenha(""); }
  }
  return (
    <Cartao Icon={User} titulo="Meu perfil" info="Edite seu nome e consulte seu e-mail. A troca de senha aparece quando o tipo de login permite.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
        <Campo rotulo="E-mail"><Input value={email} disabled /></Campo>
        {podeSenha && <Campo rotulo="Nova senha"><Input type="password" autoComplete="new-password" placeholder="Deixe vazio para manter" value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>}
      </div>
      <Button className="mt-4" onClick={salvar}>Salvar alterações</Button>
    </Cartao>
  );
}

const PCTS = [["imposto_pct", "Imposto (%)"], ["custo_fixo_pct", "Custo fixo (%)"], ["ads_pct", "Ads (%)"]] as const;
type Form = { nome: string; razao_social: string; cnpj: string; telefone: string; endereco: string; imposto_pct: string; custo_fixo_pct: string; ads_pct: string };

function DadosEmpresa({ empresaId }: { empresaId: string }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form | null>(null);
  const { data } = useQuery({
    queryKey: ["empresa-config", empresaId],
    queryFn: async () => (await supabase.from("empresas").select("nome, razao_social, cnpj, telefone, endereco, imposto_pct, custo_fixo_pct, ads_pct").eq("id", empresaId).single()).data,
  });
  useEffect(() => { if (data) setF({ nome: data.nome, razao_social: data.razao_social, cnpj: data.cnpj, telefone: data.telefone, endereco: data.endereco,
    imposto_pct: data.imposto_pct?.toString() ?? "", custo_fixo_pct: data.custo_fixo_pct?.toString() ?? "", ads_pct: data.ads_pct?.toString() ?? "" }); }, [data]);
  if (!f) return null;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  async function salvar() {
    const pct: Record<string, number | null> = {};
    for (const [k, r] of PCTS) {
      const v = f![k].trim().replace(",", ".");
      if (!v) { pct[k] = null; continue; }
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0 || n > 100) { toast.error(`${r} deve ficar entre 0 e 100.`); return; }
      pct[k] = n;
    }
    const { data: r, error } = await supabase.from("empresas").update({ nome: f!.nome.trim(), razao_social: f!.razao_social.trim(), cnpj: f!.cnpj.trim(), telefone: f!.telefone.trim(), endereco: f!.endereco.trim(), ...pct }).eq("id", empresaId).select("id");
    if (error || !r?.length) { toast.error(error?.message ?? "Somente administradores podem editar."); return; }
    toast.success("Dados da empresa salvos."); qc.invalidateQueries();
  }
  return (
    <Cartao Icon={Building2} titulo="Dados da empresa" info="Dados da empresa selecionada, reutilizados nos pedidos e PDFs. Somente administradores podem editar.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Nome"><Input value={f.nome} onChange={set("nome")} /></Campo>
        <Campo rotulo="Razão social"><Input value={f.razao_social} onChange={set("razao_social")} /></Campo>
        <Campo rotulo="CNPJ"><Input value={f.cnpj} onChange={set("cnpj")} /></Campo>
        <Campo rotulo="Telefone"><Input value={f.telefone} onChange={set("telefone")} /></Campo>
        <Campo rotulo="Endereço de entrega"><Input value={f.endereco} onChange={set("endereco")} /></Campo>
      </div>
      <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
        {PCTS.map(([k, r]) => <Campo key={k} rotulo={r}><Input inputMode="decimal" placeholder="Não informado" value={f[k]} onChange={set(k)} /></Campo>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Usados no cálculo de lucro das promoções. Informe em percentual (0 a 100). Deixe vazio o que ainda não souber.</p>
      <Button className="mt-4" onClick={salvar}>Salvar alterações</Button>
    </Cartao>
  );
}

const AVISOS = [["estoque", "Estoque"], ["pedidos", "Pedidos"], ["full", "Full"]] as const;
function Preferencias() {
  const [av, setAv] = useState({ estoque: true, pedidos: true, full: true });
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { const a = data.user?.user_metadata?.["avisos"]; if (a) setAv({ estoque: a.estoque !== false, pedidos: a.pedidos !== false, full: a.full !== false }); }); }, []);
  async function salvar() {
    const { error } = await supabase.auth.updateUser({ data: { avisos: av } });
    if (error) toast.error(error.message); else toast.success("Preferências salvas.");
  }
  return (
    <Cartao Icon={Bell} titulo="Preferências" info="Escolha quais avisos de estoque, pedidos e Full aparecem no sino do início. Ficam salvas na sua conta.">
      <div className="space-y-3">
        {AVISOS.map(([k, r]) => <label key={k} className="flex items-center gap-2 text-sm text-foreground"><Checkbox checked={av[k]} onCheckedChange={(c) => setAv({ ...av, [k]: c === true })} />{r}</label>)}
      </div>
      <Button className="mt-4" onClick={salvar}>Salvar alterações</Button>
    </Cartao>
  );
}
