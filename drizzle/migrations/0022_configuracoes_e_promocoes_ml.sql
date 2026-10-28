ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS razao_social text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefone text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS imposto_pct numeric(5,2) CHECK (imposto_pct >= 0 AND imposto_pct <= 100),
  ADD COLUMN IF NOT EXISTS custo_fixo_pct numeric(5,2) CHECK (custo_fixo_pct >= 0 AND custo_fixo_pct <= 100),
  ADD COLUMN IF NOT EXISTS ads_pct numeric(5,2) CHECK (ads_pct >= 0 AND ads_pct <= 100);
ALTER TABLE public.promocoes
  ADD COLUMN IF NOT EXISTS imposto_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS custo_fixo_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS ads_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS ml_item_id text,
  ADD COLUMN IF NOT EXISTS ml_promocao_id text,
  ADD COLUMN IF NOT EXISTS ml_status text NOT NULL DEFAULT 'nao_enviada' CHECK (ml_status IN ('nao_enviada','pendente','enviada','erro')),
  ADD COLUMN IF NOT EXISTS ml_erro text,
  ADD COLUMN IF NOT EXISTS ml_sincronizado_em timestamptz;