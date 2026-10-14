CREATE TABLE public.ml_contas (
  empresa_id uuid PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  ml_user_id bigint,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  oauth_state text,
  conectado_em timestamptz,
  sincronizado_em timestamptz,
  ultimo_erro text
);
GRANT ALL ON public.ml_contas TO service_role;
ALTER TABLE public.ml_contas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.ml_estoque_full (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  sku text NOT NULL,
  inventory_id text NOT NULL,
  titulo text NOT NULL DEFAULT '',
  quantidade integer NOT NULL DEFAULT 0,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, inventory_id)
);
GRANT SELECT ON public.ml_estoque_full TO authenticated;
GRANT ALL ON public.ml_estoque_full TO service_role;
ALTER TABLE public.ml_estoque_full ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê estoque Full ML" ON public.ml_estoque_full FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));