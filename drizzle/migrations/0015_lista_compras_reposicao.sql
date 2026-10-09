ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'cancelado';

ALTER TABLE public.empresas
  ADD COLUMN reposicao_atencao_pct integer NOT NULL DEFAULT 120 CHECK (reposicao_atencao_pct BETWEEN 100 AND 500),
  ADD COLUMN reposicao_alvo_pct integer NOT NULL DEFAULT 130 CHECK (reposicao_alvo_pct BETWEEN 100 AND 1000);

ALTER TABLE public.pedidos
  ADD COLUMN origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'lista_compras')),
  ADD COLUMN rascunho boolean NOT NULL DEFAULT false,
  ADD COLUMN lista_ref text;
GRANT UPDATE (rascunho) ON public.pedidos TO authenticated;

ALTER TABLE public.pedido_itens
  ADD COLUMN quantidade_recebida integer NOT NULL DEFAULT 0 CHECK (quantidade_recebida >= 0);

CREATE TABLE public.geracoes_lista_compras (
  chave uuid PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  lista_ref text NOT NULL,
  resultado jsonb NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.geracoes_lista_compras TO authenticated;
GRANT ALL ON public.geracoes_lista_compras TO service_role;
ALTER TABLE public.geracoes_lista_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê gerações de listas" ON public.geracoes_lista_compras FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Recebimento: registra a quantidade recebida por item (saldo pendente = quantidade - recebida).
CREATE OR REPLACE FUNCTION public.confirmar_recebimento_pedido(_pedido_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_pedido public.pedidos;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário entrar para confirmar um recebimento' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_pedido FROM public.pedidos WHERE id = _pedido_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF v_pedido.status::text <> 'planejado' THEN
    RAISE EXCEPTION 'Este pedido já foi recebido ou cancelado' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.pedido_itens WHERE pedido_id = _pedido_id) THEN
    RAISE EXCEPTION 'Adicione pelo menos um produto antes de confirmar' USING ERRCODE = '22023';
  END IF;
  PERFORM p.id FROM public.produtos p JOIN public.pedido_itens i ON i.produto_id = p.id
  WHERE i.pedido_id = _pedido_id ORDER BY p.id FOR UPDATE OF p;

  UPDATE public.produtos p
  SET estoque = p.estoque + GREATEST(0, i.quantidade - i.quantidade_recebida)
  FROM public.pedido_itens i
  WHERE i.pedido_id = _pedido_id AND i.produto_id = p.id;

  UPDATE public.pedido_itens SET quantidade_recebida = quantidade WHERE pedido_id = _pedido_id;

  UPDATE public.pedidos
  SET status = 'recebido', received_by = auth.uid(), received_at = now(), rascunho = false
  WHERE id = _pedido_id;
  RETURN jsonb_build_object('id', _pedido_id, 'status', 'recebido');
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancelar_pedido(_pedido_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem cancelar pedidos.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.pedidos SET status = 'cancelado'
  WHERE id = _pedido_id AND status::text = 'planejado';
  IF NOT FOUND THEN RAISE EXCEPTION 'Só pedidos em aberto podem ser cancelados.' USING ERRCODE = '22023'; END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.cancelar_pedido(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancelar_pedido(uuid) TO authenticated, service_role;

-- Gera rascunhos de pedido por marca, recalculando a necessidade no servidor. Idempotente pela chave.
CREATE OR REPLACE FUNCTION public.gerar_pedidos_reposicao(_empresa_id uuid, _chave uuid, _lista_ref text, _itens jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_emp public.empresas;
  v_prev jsonb;
  v_item jsonb;
  v_prod record;
  v_pend integer;
  v_atual integer;
  v_qtd integer;
  v_pedido_id uuid;
  v_numero bigint;
  v_marca record;
  v_pedidos jsonb := '[]'::jsonb;
  v_ajustados integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem gerar pedidos.' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('reposicao:' || _empresa_id::text));

  SELECT resultado INTO v_prev FROM public.geracoes_lista_compras WHERE chave = _chave;
  IF FOUND THEN RETURN v_prev || jsonb_build_object('repetida', true); END IF;

  SELECT * INTO v_emp FROM public.empresas WHERE id = _empresa_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada' USING ERRCODE = 'P0002'; END IF;

  CREATE TEMP TABLE _rep (produto_id uuid, marca_id uuid, quantidade integer) ON COMMIT DROP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(_itens, '[]'::jsonb)) LOOP
    SELECT p.id, p.estoque, p.estoque_minimo, p.marca_id INTO v_prod
    FROM public.produtos p JOIN public.marcas m ON m.id = p.marca_id
    WHERE p.id = (v_item->>'produto_id')::uuid AND m.empresa_id = _empresa_id
    FOR UPDATE OF p;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT COALESCE(SUM(GREATEST(0, i.quantidade - i.quantidade_recebida)), 0) INTO v_pend
    FROM public.pedido_itens i JOIN public.pedidos pe ON pe.id = i.pedido_id
    WHERE i.produto_id = v_prod.id AND pe.status::text = 'planejado';

    v_atual := CASE WHEN v_prod.estoque_minimo > 0
                     AND v_prod.estoque * 100 <= v_prod.estoque_minimo * v_emp.reposicao_atencao_pct
      THEN GREATEST(0, CEIL(v_prod.estoque_minimo * v_emp.reposicao_alvo_pct / 100.0)::integer - v_prod.estoque - v_pend)
      ELSE 0 END;

    v_qtd := COALESCE((v_item->>'quantidade')::integer, 0);
    -- Se outro pedido cobriu parte da necessidade desde que a lista foi aberta, desconta essa diferença.
    IF COALESCE((v_item->>'sugestao')::integer, 0) > v_atual THEN
      v_qtd := v_qtd - (COALESCE((v_item->>'sugestao')::integer, 0) - v_atual);
      v_ajustados := v_ajustados + 1;
    END IF;
    IF v_qtd > 0 THEN INSERT INTO _rep VALUES (v_prod.id, v_prod.marca_id, v_qtd); END IF;
  END LOOP;

  FOR v_marca IN SELECT DISTINCT m.id, m.nome, m.ordem FROM _rep r JOIN public.marcas m ON m.id = r.marca_id ORDER BY m.ordem, m.nome LOOP
    INSERT INTO public.pedidos (nome, fornecedor, empresa_id, created_by, data_pedido, endereco_entrega, origem, rascunho, lista_ref)
    VALUES (left(v_marca.nome, 120), left(v_emp.nome, 120), _empresa_id, auth.uid(), (now() AT TIME ZONE 'America/Sao_Paulo')::date, v_emp.endereco, 'lista_compras', true, _lista_ref)
    RETURNING id, numero INTO v_pedido_id, v_numero;
    INSERT INTO public.pedido_itens (pedido_id, produto_id, quantidade)
    SELECT v_pedido_id, produto_id, SUM(quantidade) FROM _rep WHERE marca_id = v_marca.id GROUP BY produto_id;
    v_pedidos := v_pedidos || jsonb_build_object('id', v_pedido_id, 'numero', v_numero, 'marca', v_marca.nome);
  END LOOP;

  v_prev := jsonb_build_object('pedidos', v_pedidos, 'ajustados', v_ajustados);
  INSERT INTO public.geracoes_lista_compras (chave, empresa_id, lista_ref, resultado) VALUES (_chave, _empresa_id, _lista_ref, v_prev);
  RETURN v_prev;
END;
$function$;
REVOKE ALL ON FUNCTION public.gerar_pedidos_reposicao(uuid, uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gerar_pedidos_reposicao(uuid, uuid, text, jsonb) TO authenticated, service_role;