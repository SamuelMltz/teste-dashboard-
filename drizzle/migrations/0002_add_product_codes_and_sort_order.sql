ALTER TABLE public.marcas
  ADD COLUMN ordem integer NOT NULL DEFAULT 0;

ALTER TABLE public.produtos
  ADD COLUMN codigo text NOT NULL DEFAULT '',
  ADD COLUMN ordem integer NOT NULL DEFAULT 0;

WITH marcas_ordenadas AS (
  SELECT id, row_number() OVER (PARTITION BY empresa_id ORDER BY created_at, id) - 1 AS nova_ordem
  FROM public.marcas
)
UPDATE public.marcas AS m
SET ordem = marcas_ordenadas.nova_ordem
FROM marcas_ordenadas
WHERE m.id = marcas_ordenadas.id;

WITH produtos_ordenados AS (
  SELECT id, row_number() OVER (PARTITION BY marca_id ORDER BY created_at, id) - 1 AS nova_ordem
  FROM public.produtos
)
UPDATE public.produtos AS p
SET ordem = produtos_ordenados.nova_ordem
FROM produtos_ordenados
WHERE p.id = produtos_ordenados.id;

CREATE INDEX marcas_empresa_ordem_idx ON public.marcas (empresa_id, ordem);
CREATE INDEX produtos_marca_ordem_idx ON public.produtos (marca_id, ordem);