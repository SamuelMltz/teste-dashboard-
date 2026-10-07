ALTER TABLE public.full_cargas
ADD COLUMN data_prevista timestamp with time zone;

COMMENT ON COLUMN public.full_cargas.data_prevista IS 'Data e hora previstas para o envio Full; usada nos alertas de prazo do dashboard.';