import { createFileRoute } from "@tanstack/react-router";
import { credenciaisDe, ML_REDIRECT_URI } from "@/lib/ml.functions";

export const Route = createFileRoute("/api/public/ml/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state") ?? "";
        const voltar = (msg: string) =>
          Response.redirect(`${url.origin}/graficos?ml=${encodeURIComponent(msg)}`, 302);
        if (!code || !state.includes(".")) return voltar("erro");
        const empresaId = state.split(".")[0];
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const admin = supabaseAdmin as any;
        const { data: c } = await admin.from("ml_contas").select("oauth_state, client_id, client_secret").eq("empresa_id", empresaId).maybeSingle();
        if (!c || c.oauth_state !== state) return voltar("erro");
        const cred = credenciaisDe(c);
        const r = await fetch("https://api.mercadolibre.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: cred.id,
            client_secret: cred.secret,
            code,
            redirect_uri: ML_REDIRECT_URI,
          }),
        });
        const j: any = await r.json();
        if (!r.ok) {
          console.error("ML token", j);
          return voltar("erro");
        }
        await admin
          .from("ml_contas")
          .update({
            ml_user_id: j.user_id,
            access_token: j.access_token,
            refresh_token: j.refresh_token,
            expires_at: new Date(Date.now() + j.expires_in * 1000).toISOString(),
            oauth_state: null,
            conectado_em: new Date().toISOString(),
            ultimo_erro: null,
          })
          .eq("empresa_id", empresaId);
        return voltar("conectado");
      },
    },
  },
});
