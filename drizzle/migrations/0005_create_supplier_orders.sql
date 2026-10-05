CREATE TYPE public.pedido_status AS ENUM ('planejado', 'recebido');

CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
  nome text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 120),
  fornecedor text NOT NULL CHECK (char_length(btrim(fornecedor)) BETWEEN 1 AND 120),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  status public.pedido_status NOT NULL DEFAULT 'planejado',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid,
  received_at timestamptz
);

GRANT SELECT, INSERT, DELETE ON public.pedidos TO authenticated;
GRANT UPDATE (nome, fornecedor) ON public.pedidos TO authenticated;
GRANT ALL ON public.pedidos TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.pedidos_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.pedidos_numero_seq TO service_role;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem pedidos"
ON public.pedidos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam pedidos"
ON public.pedidos FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND status = 'planejado' AND received_by IS NULL AND received_at IS NULL);

CREATE POLICY "Autenticados editam pedidos planejados"
ON public.pedidos FOR UPDATE TO authenticated
USING (status = 'planejado') WITH CHECK (status = 'planejado');

CREATE POLICY "Autenticados apagam pedidos planejados"
ON public.pedidos FOR DELETE TO authenticated USING (status = 'planejado');

CREATE TABLE public.pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pedido_id, produto_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedido_itens TO authenticated;
GRANT ALL ON public.pedido_itens TO service_role;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados veem itens de pedidos"
ON public.pedido_itens FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados criam itens em pedidos planejados"
ON public.pedido_itens FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_id AND p.status = 'planejado'
));

CREATE POLICY "Autenticados editam itens em pedidos planejados"
ON public.pedido_itens FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_id AND p.status = 'planejado'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_id AND p.status = 'planejado'
));

CREATE POLICY "Autenticados apagam itens em pedidos planejados"
ON public.pedido_itens FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.pedidos p
  WHERE p.id = pedido_id AND p.status = 'planejado'
));

CREATE INDEX pedidos_empresa_status_idx ON public.pedidos (empresa_id, status, created_at DESC);
CREATE INDEX pedido_itens_pedido_idx ON public.pedido_itens (pedido_id);
CREATE INDEX pedido_itens_produto_idx ON public.pedido_itens (produto_id);

CREATE OR REPLACE FUNCTION public.validar_item_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.pedido_status;
  v_empresa_pedido uuid;
  v_empresa_produto uuid;
BEGIN
  SELECT p.status, p.empresa_id INTO v_status, v_empresa_pedido
  FROM public.pedidos p WHERE p.id = NEW.pedido_id;

  IF NOT FOUND OR v_status <> 'planejado' THEN
    RAISE EXCEPTION 'O pedido não existe ou já foi recebido';
  END IF;

  SELECT m.empresa_id INTO v_empresa_produto
  FROM public.produtos p
  JOIN public.marcas m ON m.id = p.marca_id
  WHERE p.id = NEW.produto_id;

  IF NOT FOUND OR v_empresa_produto <> v_empresa_pedido THEN
    RAISE EXCEPTION 'O produto não pertence à empresa deste pedido';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validar_item_pedido_antes_de_salvar
BEFORE INSERT OR UPDATE ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.validar_item_pedido();

CREATE OR REPLACE FUNCTION public.confirmar_recebimento_pedido(_pedido_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido public.pedidos;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário entrar para confirmar um recebimento' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pedido
  FROM public.pedidos
  WHERE id = _pedido_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF v_pedido.status <> 'planejado' THEN
    RAISE EXCEPTION 'Este pedido já foi recebido' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.pedido_itens WHERE pedido_id = _pedido_id) THEN
    RAISE EXCEPTION 'Adicione pelo menos um produto antes de confirmar' USING ERRCODE = '22023';
  END IF;

  PERFORM p.id
  FROM public.produtos p
  JOIN public.pedido_itens i ON i.produto_id = p.id
  WHERE i.pedido_id = _pedido_id
  ORDER BY p.id
  FOR UPDATE OF p;

  UPDATE public.produtos p
  SET estoque = p.estoque + i.quantidade
  FROM public.pedido_itens i
  WHERE i.pedido_id = _pedido_id AND i.produto_id = p.id;

  UPDATE public.pedidos
  SET status = 'recebido', received_by = auth.uid(), received_at = now()
  WHERE id = _pedido_id;

  RETURN jsonb_build_object('id', _pedido_id, 'status', 'recebido');
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_recebimento_pedido(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pedido(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_recebimento_pedido(uuid) TO service_role;