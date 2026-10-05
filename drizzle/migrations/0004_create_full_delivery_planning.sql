CREATE TYPE public.full_status AS ENUM ('planejada', 'confirmada');

CREATE TABLE public.full_cargas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 120),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  status public.full_status NOT NULL DEFAULT 'planejada',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_by uuid,
  confirmed_at timestamptz
);

GRANT SELECT, INSERT, DELETE ON public.full_cargas TO authenticated;
GRANT UPDATE (nome) ON public.full_cargas TO authenticated;
GRANT ALL ON public.full_cargas TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.full_cargas_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.full_cargas_numero_seq TO service_role;
ALTER TABLE public.full_cargas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem cargas Full"
ON public.full_cargas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam cargas Full"
ON public.full_cargas FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND status = 'planejada' AND confirmed_by IS NULL AND confirmed_at IS NULL);

CREATE POLICY "Autenticados editam cargas Full planejadas"
ON public.full_cargas FOR UPDATE TO authenticated
USING (status = 'planejada') WITH CHECK (status = 'planejada');

CREATE POLICY "Autenticados apagam cargas Full planejadas"
ON public.full_cargas FOR DELETE TO authenticated USING (status = 'planejada');

CREATE TABLE public.full_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carga_id uuid NOT NULL REFERENCES public.full_cargas(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (carga_id, produto_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.full_itens TO authenticated;
GRANT ALL ON public.full_itens TO service_role;
ALTER TABLE public.full_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem itens Full"
ON public.full_itens FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam itens em cargas planejadas"
ON public.full_itens FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.full_cargas c
  WHERE c.id = carga_id AND c.status = 'planejada'
));

CREATE POLICY "Autenticados editam itens em cargas planejadas"
ON public.full_itens FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.full_cargas c
  WHERE c.id = carga_id AND c.status = 'planejada'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.full_cargas c
  WHERE c.id = carga_id AND c.status = 'planejada'
));

CREATE POLICY "Autenticados apagam itens em cargas planejadas"
ON public.full_itens FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.full_cargas c
  WHERE c.id = carga_id AND c.status = 'planejada'
));

CREATE INDEX full_cargas_empresa_status_idx ON public.full_cargas (empresa_id, status, created_at DESC);
CREATE INDEX full_itens_carga_idx ON public.full_itens (carga_id);
CREATE INDEX full_itens_produto_idx ON public.full_itens (produto_id);

CREATE OR REPLACE FUNCTION public.validar_item_full()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.full_status;
  v_empresa_carga uuid;
  v_empresa_produto uuid;
BEGIN
  SELECT c.status, c.empresa_id INTO v_status, v_empresa_carga
  FROM public.full_cargas c WHERE c.id = NEW.carga_id;

  IF NOT FOUND OR v_status <> 'planejada' THEN
    RAISE EXCEPTION 'A carga não existe ou já foi confirmada';
  END IF;

  SELECT m.empresa_id INTO v_empresa_produto
  FROM public.produtos p
  JOIN public.marcas m ON m.id = p.marca_id
  WHERE p.id = NEW.produto_id;

  IF NOT FOUND OR v_empresa_produto <> v_empresa_carga THEN
    RAISE EXCEPTION 'O produto não pertence à empresa desta carga';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_item_full_antes_de_salvar
BEFORE INSERT OR UPDATE ON public.full_itens
FOR EACH ROW EXECUTE FUNCTION public.validar_item_full();

CREATE OR REPLACE FUNCTION public.confirmar_carga_full(_carga_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carga public.full_cargas;
  v_insuficiente record;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário entrar para confirmar uma carga' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_carga
  FROM public.full_cargas
  WHERE id = _carga_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga não encontrada' USING ERRCODE = 'P0002';
  END IF;

  IF v_carga.status <> 'planejada' THEN
    RAISE EXCEPTION 'Esta carga já foi confirmada' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.full_itens WHERE carga_id = _carga_id) THEN
    RAISE EXCEPTION 'Adicione pelo menos um produto antes de confirmar' USING ERRCODE = '22023';
  END IF;

  PERFORM p.id
  FROM public.produtos p
  JOIN public.full_itens i ON i.produto_id = p.id
  WHERE i.carga_id = _carga_id
  ORDER BY p.id
  FOR UPDATE OF p;

  SELECT p.nome, p.estoque, i.quantidade INTO v_insuficiente
  FROM public.full_itens i
  JOIN public.produtos p ON p.id = i.produto_id
  WHERE i.carga_id = _carga_id AND p.estoque < i.quantidade
  ORDER BY p.nome
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Estoque insuficiente para % (disponível: %, solicitado: %)',
      v_insuficiente.nome, v_insuficiente.estoque, v_insuficiente.quantidade
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.produtos p
  SET estoque = p.estoque - i.quantidade
  FROM public.full_itens i
  WHERE i.carga_id = _carga_id AND i.produto_id = p.id;

  UPDATE public.full_cargas
  SET status = 'confirmada', confirmed_by = auth.uid(), confirmed_at = now()
  WHERE id = _carga_id;

  RETURN jsonb_build_object('id', _carga_id, 'status', 'confirmada');
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_carga_full(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_carga_full(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_carga_full(uuid) TO service_role;