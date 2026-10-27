CREATE TABLE public.promocoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  nome text NOT NULL DEFAULT '',
  desconto_pct numeric(5,2) NOT NULL CHECK (desconto_pct > 0 AND desconto_pct < 100),
  data_inicio date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo'))::date,
  data_fim date NOT NULL,
  encerrada boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (data_fim >= data_inicio)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promocoes TO authenticated;
GRANT ALL ON public.promocoes TO service_role;
ALTER TABLE public.promocoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê promoções" ON public.promocoes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin cria promoções" ON public.promocoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by = auth.uid());
CREATE POLICY "Admin edita promoções" ON public.promocoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin apaga promoções" ON public.promocoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX promocoes_empresa_idx ON public.promocoes(empresa_id);