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
  v_ref integer;
  v_tem_vendas boolean;
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
  v_tem_vendas := EXISTS (SELECT 1 FROM public.ml_vendas WHERE empresa_id = _empresa_id);

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(_itens, '[]'::jsonb)) LOOP
    SELECT p.id, p.estoque, p.estoque_minimo, p.marca_id, p.codigo INTO v_prod
    FROM public.produtos p JOIN public.marcas m ON m.id = p.marca_id
    WHERE p.id = (v_item->>'produto_id')::uuid AND m.empresa_id = _empresa_id
    FOR UPDATE OF p;
    IF NOT FOUND THEN CONTINUE; END IF;

    SELECT COALESCE(SUM(GREATEST(0, i.quantidade - i.quantidade_recebida)), 0) INTO v_pend
    FROM public.pedido_itens i JOIN public.pedidos pe ON pe.id = i.pedido_id
    WHERE i.produto_id = v_prod.id AND pe.status::text = 'planejado';

    -- Vendas dos últimos 30 dias têm prioridade; sem vendas ou sem dados usa o mínimo manual.
    v_ref := NULL;
    IF v_tem_vendas THEN
      SELECT SUM(unidades)::integer INTO v_ref FROM public.ml_vendas
      WHERE empresa_id = _empresa_id AND upper(trim(sku)) = upper(trim(v_prod.codigo));
    END IF;
    IF COALESCE(v_ref, 0) <= 0 THEN v_ref := v_prod.estoque_minimo; END IF;
    v_atual := CASE WHEN v_ref > 0
                     AND v_prod.estoque * 100 <= v_ref * v_emp.reposicao_atencao_pct
      THEN GREATEST(0, CEIL(v_ref * v_emp.reposicao_alvo_pct / 100.0)::integer - v_prod.estoque - v_pend)
      ELSE 0 END;

    v_qtd := COALESCE((v_item->>'quantidade')::integer, 0);
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