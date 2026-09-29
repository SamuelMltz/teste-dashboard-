CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  accent text NOT NULL DEFAULT '#94a3b8',
  ordem int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.marcas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  slug text NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, slug)
);
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  estoque int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.marcas(empresa_id);
CREATE INDEX ON public.produtos(marca_id);

GRANT SELECT ON public.empresas, public.marcas, public.produtos TO anon, authenticated;
GRANT ALL ON public.empresas, public.marcas, public.produtos TO service_role;

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de empresas" ON public.empresas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Leitura pública de marcas" ON public.marcas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Leitura pública de produtos" ON public.produtos FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.empresas (slug, nome, accent, ordem) VALUES
  ('vivalle', 'Vivalle', '#34d399', 1),
  ('luminartech', 'Luminartech', '#38bdf8', 2),
  ('vitrine', 'Vitrine', '#fbbf24', 3);