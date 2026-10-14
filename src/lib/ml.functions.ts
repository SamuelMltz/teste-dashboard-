import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ML_CLIENT_ID = "3608041717738183";
export const ML_REDIRECT_URI = "https://dashboardvlv.lovable.app/api/public/ml/callback";
const API = "https://api.mercadolibre.com";

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Apenas administradores.");
}

export const statusMl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { empresaId: string }) => d)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: c } = await (supabaseAdmin as any)
      .from("ml_contas")
      .select("ml_user_id, conectado_em, sincronizado_em, ultimo_erro, refresh_token")
      .eq("empresa_id", data.empresaId)
      .maybeSingle();
    return {
      conectado: !!c?.refresh_token,
      conectadoEm: c?.conectado_em ?? null,
      sincronizadoEm: c?.sincronizado_em ?? null,
      erro: c?.ultimo_erro ?? null,
    };
  });

export const urlConectarMl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { empresaId: string }) => d)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const state = `${data.empresaId}.${crypto.randomUUID()}`;
    await (supabaseAdmin as any)
      .from("ml_contas")
      .upsert({ empresa_id: data.empresaId, oauth_state: state }, { onConflict: "empresa_id" });
    const u = new URL("https://auth.mercadolivre.com.br/authorization");
    u.searchParams.set("response_type", "code");
    u.searchParams.set("client_id", ML_CLIENT_ID);
    u.searchParams.set("redirect_uri", ML_REDIRECT_URI);
    u.searchParams.set("state", state);
    return { url: u.toString() };
  });

async function tokenValido(admin: any, empresaId: string) {
  const { data: c } = await admin.from("ml_contas").select("*").eq("empresa_id", empresaId).maybeSingle();
  if (!c?.refresh_token) throw new Error("Conta do Mercado Livre não conectada.");
  if (c.access_token && c.expires_at && new Date(c.expires_at).getTime() > Date.now() + 60_000) return c;
  const r = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ML_CLIENT_ID,
      client_secret: process.env["ML_CLIENT_SECRET"]!,
      refresh_token: c.refresh_token,
    }),
  });
  const j: any = await r.json();
  if (!r.ok) throw new Error("A autorização do Mercado Livre expirou. Conecte novamente.");
  const novo = {
    access_token: j.access_token,
    refresh_token: j.refresh_token ?? c.refresh_token,
    expires_at: new Date(Date.now() + j.expires_in * 1000).toISOString(),
  };
  await admin.from("ml_contas").update(novo).eq("empresa_id", empresaId);
  return { ...c, ...novo };
}

function skuDe(o: any): string {
  const attr = (o?.attributes ?? []).find((a: any) => a.id === "SELLER_SKU");
  return String(o?.seller_custom_field || attr?.value_name || "").trim();
}

export const sincronizarFullMl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { empresaId: string }) => d)
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    try {
      const c = await tokenValido(admin, data.empresaId);
      const h = { Authorization: `Bearer ${c.access_token}` };
      const get = async (path: string) => {
        const r = await fetch(`${API}${path}`, { headers: h });
        if (!r.ok) throw new Error(`Mercado Livre respondeu ${r.status} em ${path.split("?")[0]}`);
        return r.json() as Promise<any>;
      };
      // 1. IDs dos anúncios com logística Full
      const ids: string[] = [];
      let scroll: string | undefined;
      for (let i = 0; i < 50; i++) {
        const q = `/users/${c.ml_user_id}/items/search?logistic_type=fulfillment&search_type=scan&limit=100${scroll ? `&scroll_id=${scroll}` : ""}`;
        const j = await get(q);
        const res: string[] = j.results ?? [];
        ids.push(...res);
        scroll = j.scroll_id;
        if (!res.length || !scroll) break;
      }
      // 2. inventory_id + SKU (incluindo variações)
      const alvos = new Map<string, { sku: string; titulo: string }>();
      for (let i = 0; i < ids.length; i += 20) {
        const lote = ids.slice(i, i + 20).join(",");
        const j: any[] = await get(`/items?ids=${lote}&attributes=id,title,inventory_id,seller_custom_field,attributes,variations`);
        for (const e of j) {
          const it = e.body;
          if (!it) continue;
          const vars: any[] = it.variations ?? [];
          if (vars.some((v) => v.inventory_id)) {
            for (const v of vars) if (v.inventory_id) alvos.set(v.inventory_id, { sku: skuDe(v) || skuDe(it), titulo: it.title });
          } else if (it.inventory_id) {
            alvos.set(it.inventory_id, { sku: skuDe(it), titulo: it.title });
          }
        }
      }
      // 3. Estoque disponível no Full
      const agora = new Date().toISOString();
      const linhas: any[] = [];
      for (const [inv, info] of alvos) {
        try {
          const s = await get(`/inventories/${inv}/stock/fulfillment`);
          linhas.push({
            empresa_id: data.empresaId,
            inventory_id: inv,
            sku: info.sku,
            titulo: info.titulo ?? "",
            quantidade: Number(s.available_quantity ?? 0),
            atualizado_em: agora,
          });
        } catch (err) {
          console.error("estoque inv", inv, err);
        }
      }
      if (linhas.length) {
        const { error } = await admin.from("ml_estoque_full").upsert(linhas, { onConflict: "empresa_id,inventory_id" });
        if (error) throw new Error(error.message);
      }
      await admin.from("ml_estoque_full").delete().eq("empresa_id", data.empresaId).lt("atualizado_em", agora);
      await admin.from("ml_contas").update({ sincronizado_em: agora, ultimo_erro: null }).eq("empresa_id", data.empresaId);
      return { ok: true, anuncios: ids.length, itens: linhas.length, unidades: linhas.reduce((s, l) => s + l.quantidade, 0) };
    } catch (e: any) {
      console.error("sync ML", e);
      await admin.from("ml_contas").update({ ultimo_erro: String(e?.message ?? e) }).eq("empresa_id", data.empresaId);
      return { ok: false, erro: String(e?.message ?? e) };
    }
  });
