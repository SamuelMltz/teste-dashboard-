import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, PackageCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { brParaYmd, hojeSP, ymdParaBr } from "@/lib/datas";
import { useEmpresaAtual } from "@/lib/empresa-atual";
import { CONDICAO_ROTULO, STATUS_ROTULO, origensDevolucao, podeLancarEstoque, statusPermitidos, type DevolucaoCondicao, type DevolucaoStatus } from "@/lib/devolucoes";

const campo = "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-section";

type Devolucao = {
  id: string; numero: number; empresa_id: string; produto_id: string; quantidade: number; data_devolucao: string; origem: string; referencia: string | null;
  status: DevolucaoStatus; condicao: DevolucaoCondicao; observacao: string; estoque_lancado_at: string | null;
  produtos: { nome: string; codigo: string } | null;
};
type ProdutoOpcao = { id: string; nome: string; codigo: string; estoque: number };

const corStatus: Record<DevolucaoStatus, string> = { pendente: "text-muted-foreground", em_analise: "text-section", aprovada: "text-section", finalizada: "text-muted-foreground" };
const corCondicao: Record<DevolucaoCondicao, string> = { apto: "text-success", avariado: "text-destructive", em_analise: "text-warning" };

const erroMsg = (e: { message?: string; code?: string } | null, padrao: string) =>
  e?.code === "23505" ? "Já existe devolução com essa referência para este produto." : e?.message && !e.message.includes("violates") ? e.message : padrao;

export function Devolucoes() {
  const empresaAtual = useEmpresaAtual();
  const qc = useQueryClient();
  const [empresaFiltro, setEmpresaFiltro] = useState<string>(empresaAtual?.id ?? "todas");
  const [statusFiltro, setStatusFiltro] = useState<string>("todos");
  const [de, setDe] = useState(""); const [ate, setAte] = useState("");
  const [novo, setNovo] = useState(false);
  const [historico, setHistorico] = useState<Devolucao | null>(null);
  const [lancar, setLancar] = useState<Devolucao | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const { data: empresas = [] } = useQuery({ queryKey: ["empresas-lista"], queryFn: async () => {
    const { data, error } = await supabase.from("empresas").select("id, nome").order("ordem"); if (error) throw error; return data ?? [];
  } });
  const { data: lista = [], isLoading, error } = useQuery({ queryKey: ["devolucoes"], queryFn: async () => {
    const { data, error } = await supabase.from("devolucoes").select("id, numero, empresa_id, produto_id, quantidade, data_devolucao, origem, referencia, status, condicao, observacao, estoque_lancado_at, produtos(nome, codigo)").order("data_devolucao", { ascending: false }).order("numero", { ascending: false });
    if (error) throw error; return (data ?? []) as unknown as Devolucao[];
  } });
  const atualizar = () => qc.invalidateQueries({ queryKey: ["devolucoes"] });

  const dYmd = de ? brParaYmd(de) : null; const aYmd = ate ? brParaYmd(ate) : null;
  const filtradas = lista.filter((d) => (empresaFiltro === "todas" || d.empresa_id === empresaFiltro) && (statusFiltro === "todos" || d.status === statusFiltro)
    && (!dYmd || d.data_devolucao >= dYmd) && (!aYmd || d.data_devolucao <= aYmd));
  const nomeEmpresa = (id: string) => empresas.find((e) => e.id === id)?.nome ?? "";

  async function alterar(d: Devolucao, mudanca: Partial<Pick<Devolucao, "status" | "condicao">>) {
    const prox = { ...d, ...mudanca };
    if (mudanca.condicao && prox.status === "aprovada" && prox.condicao !== "apto") prox.status = "em_analise";
    const { error } = await supabase.from("devolucoes").update({ status: prox.status, condicao: prox.condicao }).eq("id", d.id);
    if (error) toast.error(erroMsg(error, "Não foi possível atualizar.")); else atualizar();
  }

  async function confirmarLancamento() {
    if (!lancar) return; setOcupado(true);
    const { error } = await supabase.rpc("confirmar_retorno_devolucao", { _devolucao_id: lancar.id });
    setOcupado(false);
    if (error) { toast.error(erroMsg(error, "Não foi possível lançar no estoque.")); return; }
    toast.success(`+${lancar.quantidade} un. no estoque físico`); setLancar(null);
    atualizar(); qc.invalidateQueries();
  }

  async function excluir(d: Devolucao) {
    if (!confirm(`Excluir a devolução #${d.numero}?`)) return;
    const { error } = await supabase.from("devolucoes").delete().eq("id", d.id);
    if (error) toast.error("Não foi possível excluir."); else { toast.success("Devolução excluída"); atualizar(); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-xs text-muted-foreground">Empresa
          <select className={campo} value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
            <option value="todas">Todas</option>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select></label>
        <label className="grid gap-1 text-xs text-muted-foreground">Status
          <select className={campo} value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
            <option value="todos">Todos</option>{Object.entries(STATUS_ROTULO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
          </select></label>
        <label className="grid gap-1 text-xs text-muted-foreground">De<Input className="w-32" placeholder="DD/MM" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="grid gap-1 text-xs text-muted-foreground">Até<Input className="w-32" placeholder="DD/MM" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <Button onClick={() => setNovo(true)} className="ml-auto gap-2 bg-section text-section-foreground hover:bg-section/90"><Plus className="h-4 w-4" />Nova devolução</Button>
      </div>

      {error ? <p className="text-destructive">Não foi possível carregar as devoluções. Apenas administradores têm acesso.</p>
        : isLoading ? <p className="text-muted-foreground">Carregando…</p>
        : filtradas.length === 0 ? <p className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">Nenhuma devolução encontrada.</p>
        : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr><th className="p-3">#</th><th className="p-3">Data</th><th className="p-3">SKU</th><th className="p-3">Produto</th><th className="p-3 text-right">Qtd</th><th className="p-3">Empresa</th><th className="p-3">Origem</th><th className="p-3">Condição</th><th className="p-3">Status</th><th className="p-3" /></tr>
              </thead>
              <tbody>
                {filtradas.map((d) => {
                  const lancada = !!d.estoque_lancado_at;
                  return (
                    <tr key={d.id} className="border-t border-border align-middle">
                      <td className="p-3 text-muted-foreground">{d.numero}</td>
                      <td className="p-3 whitespace-nowrap">{ymdParaBr(d.data_devolucao)}</td>
                      <td className="p-3 font-mono text-xs">{d.produtos?.codigo || "—"}</td>
                      <td className="p-3">{d.produtos?.nome}{d.referencia && <span className="block text-xs text-muted-foreground">Ref. {d.referencia}</span>}</td>
                      <td className="p-3 text-right tabular-nums">{d.quantidade}</td>
                      <td className="p-3 whitespace-nowrap">{nomeEmpresa(d.empresa_id)}</td>
                      <td className="p-3 text-xs">{d.origem}</td>
                      <td className="p-3">
                        {lancada ? <span className={corCondicao[d.condicao]}>{CONDICAO_ROTULO[d.condicao]}</span> : (
                          <select aria-label="Condição" className={`${campo} h-9 ${corCondicao[d.condicao]}`} value={d.condicao} onChange={(e) => alterar(d, { condicao: e.target.value as DevolucaoCondicao })}>
                            {Object.entries(CONDICAO_ROTULO).map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                          </select>)}
                      </td>
                      <td className="p-3">
                        {lancada ? <span className={corStatus[d.status]}>{STATUS_ROTULO[d.status]} · no estoque</span> : (
                          <select aria-label="Status" className={`${campo} h-9`} value={d.status} onChange={(e) => alterar(d, { status: e.target.value as DevolucaoStatus })}>
                            {statusPermitidos(d).concat(statusPermitidos(d).includes(d.status) ? [] : [d.status]).map((s) => <option key={s} value={s}>{STATUS_ROTULO[s]}</option>)}
                          </select>)}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          {podeLancarEstoque(d) && <Button size="sm" onClick={() => setLancar(d)} className="gap-1 bg-section text-section-foreground hover:bg-section/90"><PackageCheck className="h-4 w-4" />Lançar no estoque</Button>}
                          <Button size="icon" variant="ghost" aria-label="Histórico" onClick={() => setHistorico(d)}><History className="h-4 w-4" /></Button>
                          {!lancada && <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir(d)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      <NovaDevolucao aberto={novo} onFechar={() => setNovo(false)} empresas={empresas} empresaInicial={empresaAtual?.id ?? empresas[0]?.id ?? ""} onSalvo={atualizar} />
      <Historico devolucao={historico} onFechar={() => setHistorico(null)} />

      <Dialog open={!!lancar} onOpenChange={(o) => !o && setLancar(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Lançar no estoque físico?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Serão somadas <b className="text-foreground">{lancar?.quantidade} un.</b> de <b className="text-foreground">{lancar?.produtos?.nome}</b> ao estoque físico da {lancar && nomeEmpresa(lancar.empresa_id)}. A devolução será finalizada e não poderá ser lançada novamente.</p>
          <DialogFooter><Button variant="outline" onClick={() => setLancar(null)}>Cancelar</Button><Button disabled={ocupado} onClick={confirmarLancamento} className="bg-section text-section-foreground hover:bg-section/90">{ocupado ? "Lançando…" : "Confirmar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NovaDevolucao({ aberto, onFechar, empresas, empresaInicial, onSalvo }: { aberto: boolean; onFechar: () => void; empresas: { id: string; nome: string }[]; empresaInicial: string; onSalvo: () => void }) {
  const [empresaId, setEmpresaId] = useState(empresaInicial);
  const [busca, setBusca] = useState(""); const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1"); const [data, setData] = useState(ymdParaBr(hojeSP()));
  const [origem, setOrigem] = useState(""); const [referencia, setReferencia] = useState(""); const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false); const [erro, setErro] = useState("");
  const emp = empresaId || empresaInicial;

  const { data: produtos = [] } = useQuery({ queryKey: ["produtos-devolucao", emp], enabled: aberto && !!emp, queryFn: async () => {
    const { data, error } = await supabase.from("produtos").select("id, nome, codigo, estoque, marcas!inner(empresa_id)").eq("marcas.empresa_id", emp).order("nome");
    if (error) throw error; return (data ?? []) as unknown as ProdutoOpcao[];
  } });
  const termo = busca.trim().toLowerCase();
  const opcoes = useMemo(() => produtos.filter((p) => !termo || p.nome.toLowerCase().includes(termo) || p.codigo.toLowerCase().includes(termo)).slice(0, 50), [produtos, termo]);
  const origens = origensDevolucao(empresas);

  function fechar() { setBusca(""); setProdutoId(""); setQuantidade("1"); setData(ymdParaBr(hojeSP())); setOrigem(""); setReferencia(""); setObs(""); setErro(""); onFechar(); }

  async function salvar() {
    const qtd = Number(quantidade); const ymd = brParaYmd(data);
    if (!produtoId) return setErro("Escolha o produto.");
    if (!Number.isInteger(qtd) || qtd <= 0) return setErro("Informe uma quantidade maior que zero.");
    if (!ymd) return setErro("Data inválida. Use DD/MM ou DD/MM/AAAA.");
    if (!origem) return setErro("Escolha a origem.");
    setErro(""); setSalvando(true);
    const { error } = await supabase.from("devolucoes").insert({ empresa_id: emp, produto_id: produtoId, quantidade: qtd, data_devolucao: ymd, origem, referencia: referencia.trim() || null, observacao: obs.trim() });
    setSalvando(false);
    if (error) return setErro(erroMsg(error, "Não foi possível registrar a devolução."));
    toast.success("Devolução registrada"); onSalvo(); fechar();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova devolução</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm">Empresa
            <select className={campo} value={emp} onChange={(e) => { setEmpresaId(e.target.value); setProdutoId(""); }}>{empresas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Produto
            <Input placeholder="Buscar por nome ou SKU" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <select className={campo} size={5} value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
              {opcoes.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} · ` : ""}{p.nome}</option>)}
            </select>
            {opcoes.length === 0 && <span className="text-xs text-muted-foreground">Nenhum produto encontrado.</span>}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">Quantidade<Input inputMode="numeric" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} /></label>
            <label className="grid gap-1 text-sm">Data<Input placeholder="DD/MM" value={data} onChange={(e) => setData(e.target.value)} /></label>
          </div>
          <label className="grid gap-1 text-sm">Origem
            <select className={campo} value={origem} onChange={(e) => setOrigem(e.target.value)}><option value="">Escolha…</option>{origens.map((o) => <option key={o}>{o}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Nº da venda/referência (opcional)<Input value={referencia} onChange={(e) => setReferencia(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">Observação (opcional)<Input value={obs} onChange={(e) => setObs(e.target.value)} /></label>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={fechar}>Cancelar</Button><Button disabled={salvando} onClick={salvar} className="bg-section text-section-foreground hover:bg-section/90">{salvando ? "Salvando…" : "Salvar"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const ACAO: Record<string, string> = { registrada: "Registrada", status: "Status", condicao: "Condição", quantidade: "Quantidade", estoque: "Estoque" };
const traduzir = (t: string) => t.replace(/\b(pendente|em_analise|aprovada|finalizada|apto|avariado)\b/g, (m) => (STATUS_ROTULO as Record<string, string>)[m] ?? (CONDICAO_ROTULO as Record<string, string>)[m] ?? m);

function Historico({ devolucao, onFechar }: { devolucao: Devolucao | null; onFechar: () => void }) {
  const { data = [] } = useQuery({ queryKey: ["devolucao-mov", devolucao?.id], enabled: !!devolucao, queryFn: async () => {
    const { data, error } = await supabase.from("devolucao_movimentos").select("id, acao, detalhe, created_at").eq("devolucao_id", devolucao!.id).order("created_at");
    if (error) throw error; return data ?? [];
  } });
  return (
    <Dialog open={!!devolucao} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Histórico da devolução #{devolucao?.numero}</DialogTitle></DialogHeader>
        <ol className="space-y-2 text-sm">
          {data.map((m) => <li key={m.id} className="flex gap-3 border-b border-border pb-2"><span className="w-32 shrink-0 text-muted-foreground">{new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</span><span><b>{ACAO[m.acao] ?? m.acao}</b> · {traduzir(m.detalhe)}</span></li>)}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
