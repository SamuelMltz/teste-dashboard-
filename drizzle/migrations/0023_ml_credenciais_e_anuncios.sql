ALTER TABLE public.ml_contas ADD COLUMN IF NOT EXISTS client_id text, ADD COLUMN IF NOT EXISTS client_secret text;
CREATE TABLE public.ml_anuncios (
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  sku text NOT NULL DEFAULT '',
  titulo text NOT NULL DEFAULT '',
  preco numeric(12,2),
  preco_original numeric(12,2),
  em_promocao boolean NOT NULL DEFAULT false,
  status text,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (empresa_id, item_id)
);
GRANT SELECT ON public.ml_anuncios TO authenticated;
GRANT ALL ON public.ml_anuncios TO service_role;
ALTER TABLE public.ml_anuncios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins leem anuncios" ON public.ml_anuncios FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));