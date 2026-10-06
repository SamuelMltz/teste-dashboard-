ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS endereco text NOT NULL DEFAULT '';
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cnpj text NOT NULL DEFAULT '';
GRANT UPDATE ON public.empresas TO authenticated;
CREATE POLICY "Admin edita empresas" ON public.empresas FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));