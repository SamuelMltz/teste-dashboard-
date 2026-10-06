import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Só administradores podem fazer isso.");
}

const UUID = /^[0-9a-f-]{36}$/i;

export const trocarSenhaConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; senha: string }) => {
    if (!UUID.test(d.userId)) throw new Error("Conta inválida.");
    if (typeof d.senha !== "string" || d.senha.length < 6 || d.senha.length > 72) throw new Error("A senha precisa ter entre 6 e 72 caracteres.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.senha });
    if (error) throw new Error("Não foi possível trocar a senha.");
    return { ok: true };
  });

export const excluirConta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => {
    if (!UUID.test(d.userId)) throw new Error("Conta inválida.");
    return d;
  })
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode excluir a sua própria conta.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error("Não foi possível excluir a conta.");
    return { ok: true };
  });
