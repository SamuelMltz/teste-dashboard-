ALTER TABLE public.pedidos ADD COLUMN data_pedido date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date);
ALTER TABLE public.pedidos ADD COLUMN endereco_entrega text NOT NULL DEFAULT '';
UPDATE public.pedidos SET data_pedido = (created_at AT TIME ZONE 'America/Sao_Paulo')::date;
UPDATE public.pedidos p SET endereco_entrega = e.endereco FROM public.empresas e WHERE e.id = p.empresa_id;