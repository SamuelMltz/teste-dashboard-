ALTER TABLE public.produtos ADD COLUMN cod text NOT NULL DEFAULT '';
COMMENT ON COLUMN public.produtos.cod IS 'Código do produto no fornecedor (COD)';
COMMENT ON COLUMN public.produtos.codigo IS 'SKU interno do produto';