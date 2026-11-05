CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sku text NOT NULL CHECK (btrim(sku) <> ''),
  nome text NOT NULL CHECK (btrim(nome) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX kits_empresa_sku_uniq ON public.kits (empresa_id, lower(btrim(sku)));
CREATE TABLE public.kit_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  UNIQUE (kit_id, produto_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_itens TO authenticated;
GRANT ALL ON public.kits TO service_role;
GRANT ALL ON public.kit_itens TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kit_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins gerenciam kits" ON public.kits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins gerenciam itens de kit" ON public.kit_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));