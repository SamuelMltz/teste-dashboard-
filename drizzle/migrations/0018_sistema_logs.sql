CREATE TABLE public.sistema_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid DEFAULT auth.uid(),
  empresa_id uuid,
  acao text NOT NULL,
  detalhe text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.sistema_logs TO authenticated;
GRANT ALL ON public.sistema_logs TO service_role;
ALTER TABLE public.sistema_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin vê logs" ON public.sistema_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE INDEX sistema_logs_data_idx ON public.sistema_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_full() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sistema_logs (empresa_id, acao, detalhe) VALUES (NEW.empresa_id, 'Criação de Full', '#' || lpad(NEW.numero::text,4,'0') || ' · ' || NEW.nome);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.sistema_logs (empresa_id, acao, detalhe) VALUES (OLD.empresa_id, 'Exclusão de Full', '#' || lpad(OLD.numero::text,4,'0') || ' · ' || OLD.nome);
    RETURN OLD;
  ELSIF NEW.status = 'confirmada' AND OLD.status <> 'confirmada' THEN
    INSERT INTO public.sistema_logs (empresa_id, acao, detalhe) VALUES (NEW.empresa_id, 'Confirmação de Full', '#' || lpad(NEW.numero::text,4,'0') || ' · ' || NEW.nome);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER log_full_depois AFTER INSERT OR UPDATE OR DELETE ON public.full_cargas FOR EACH ROW EXECUTE FUNCTION public.log_full();

CREATE OR REPLACE FUNCTION public.log_pedido() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.sistema_logs (empresa_id, acao, detalhe) VALUES (NEW.empresa_id, 'Criação de pedido', '#' || lpad(NEW.numero::text,4,'0') || ' · ' || NEW.nome);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.sistema_logs (empresa_id, acao, detalhe) VALUES (OLD.empresa_id, 'Exclusão de pedido', '#' || lpad(OLD.numero::text,4,'0') || ' · ' || OLD.nome);
    RETURN OLD;
  ELSIF NEW.status::text <> OLD.status::text THEN
    INSERT INTO public.sistema_logs (empresa_id, acao, detalhe) VALUES (NEW.empresa_id, CASE WHEN NEW.status::text = 'recebido' THEN 'Confirmação de pedido' ELSE 'Cancelamento de pedido' END, '#' || lpad(NEW.numero::text,4,'0') || ' · ' || NEW.nome);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER log_pedido_depois AFTER INSERT OR UPDATE OR DELETE ON public.pedidos FOR EACH ROW EXECUTE FUNCTION public.log_pedido();

CREATE OR REPLACE FUNCTION public.listar_logs()
RETURNS TABLE(id uuid, created_at timestamptz, email text, empresa text, acao text, detalhe text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas administradores podem ver os registros.'; END IF;
  RETURN QUERY SELECT l.id, l.created_at, u.email::text, e.nome, l.acao, l.detalhe
    FROM public.sistema_logs l LEFT JOIN auth.users u ON u.id = l.user_id LEFT JOIN public.empresas e ON e.id = l.empresa_id
    ORDER BY l.created_at DESC LIMIT 500;
END $$;
REVOKE ALL ON FUNCTION public.listar_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_logs() TO authenticated;