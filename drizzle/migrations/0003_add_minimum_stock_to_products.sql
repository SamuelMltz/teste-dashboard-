ALTER TABLE public.produtos
ADD COLUMN estoque_minimo integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.produtos.estoque_minimo IS 'Quantidade mínima de referência para alertas de estoque';