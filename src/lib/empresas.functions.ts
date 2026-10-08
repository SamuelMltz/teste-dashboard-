import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Empresa } from "./empresas";

const SELECT = "slug, nome, accent, marcas(slug, nome, ordem, produtos(nome, codigo, cod, estoque, estoque_minimo, ordem))";

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

// Lista todas as empresas com marcas e produtos (exige login)
export const listarEmpresas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Empresa[]> => {
    const { data, error } = await context.supabase.from("empresas").select(SELECT).order("ordem");
    if (error) throw new Error("Não foi possível carregar as empresas");
    return ((data ?? []) as unknown as Empresa[]).map(ordenarEmpresa);
  });

// Busca uma empresa pelo slug (exige login)
export const buscarEmpresa = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().max(100) }).parse(d))
  .handler(async ({ data, context }): Promise<Empresa | null> => {
    const { data: row, error } = await context.supabase
      .from("empresas")
      .select(SELECT)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error("Não foi possível carregar a empresa");
    return row ? ordenarEmpresa(row as unknown as Empresa) : null;
  });
