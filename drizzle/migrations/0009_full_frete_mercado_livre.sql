ALTER TABLE public.full_cargas
  ADD COLUMN frete_ml text,
  ADD COLUMN ml_total_produtos integer,
  ADD COLUMN ml_total_unidades integer;
CREATE UNIQUE INDEX full_cargas_empresa_frete_ml_key ON public.full_cargas (empresa_id, frete_ml) WHERE frete_ml IS NOT NULL;