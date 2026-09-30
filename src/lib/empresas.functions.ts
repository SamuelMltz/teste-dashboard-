import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { Empresa } from "./empresas";

function clientePublico() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const SELECT = "slug, nome, accent, marcas(slug, nome, ordem, produtos(nome, codigo, estoque, ordem))";

function ordenarEmpresa(empresa: Empresa): Empresa {
  return {
    ...empresa,
    marcas: [...empresa.marcas]
      .sort((a, b) => a.ordem - b.ordem)
      .map((marca) => ({
        ...marca,
        produtos: [...marca.produtos].sort((a, b) => a.ordem - b.ordem),
      })),
  };
}

// Lista todas as empresas com marcas e produtos
export const listarEmpresas = createServerFn({ method: "GET" }).handler(async (): Promise<Empresa[]> => {
  const { data, error } = await clientePublico().from("empresas").select(SELECT).order("ordem");
  if (error) throw new Error("Não foi possível carregar as empresas");
  return ((data ?? []) as Empresa[]).map(ordenarEmpresa);
});

// Busca uma empresa pelo slug
export const buscarEmpresa = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string() }).parse(d))
  .handler(async ({ data }): Promise<Empresa | null> => {
    const { data: row, error } = await clientePublico()
      .from("empresas")
      .select(SELECT)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a empresa");
    return row ? ordenarEmpresa(row as Empresa) : null;
  });
