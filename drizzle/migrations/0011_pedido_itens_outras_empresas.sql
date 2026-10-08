CREATE OR REPLACE FUNCTION public.validar_item_pedido()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_status public.pedido_status;
BEGIN
  SELECT p.status INTO v_status FROM public.pedidos p WHERE p.id = NEW.pedido_id;
  IF NOT FOUND OR v_status <> 'planejado' THEN
    RAISE EXCEPTION 'O pedido não existe ou já foi recebido';
  END IF;
  -- Pedidos de compra podem receber produtos de qualquer empresa: a entrada vai para o estoque do próprio produto.
  IF NOT EXISTS (SELECT 1 FROM public.produtos WHERE id = NEW.produto_id) THEN
    RAISE EXCEPTION 'Produto não encontrado';
  END IF;
  RETURN NEW;
END;
$function$;