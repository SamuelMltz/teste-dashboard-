ALTER TABLE public.produtos ADD COLUMN preco_custo numeric(12,2);
ALTER TABLE public.produtos ADD COLUMN preco_venda numeric(12,2);
COMMENT ON COLUMN public.produtos.preco_custo IS 'Valor de compra do produto (custo), opcional.';
COMMENT ON COLUMN public.produtos.preco_venda IS 'Valor de venda do produto, opcional.';