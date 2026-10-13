CREATE TYPE public.devolucao_status AS ENUM ('pendente','em_analise','aprovada','finalizada');
CREATE TYPE public.devolucao_condicao AS ENUM ('em_analise','apto','avariado');

CREATE TABLE public.devolucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade integer NOT NULL CHECK (quantidade > 0),
  data_devolucao date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo'))::date,
  origem text NOT NULL DEFAULT 'Outro',
  referencia text,
  status public.devolucao_status NOT NULL DEFAULT 'pendente',
  condicao public.devolucao_condicao NOT NULL DEFAULT 'em_analise',
  observacao text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  estoque_lancado_at timestamptz,
  estoque_lancado_by uuid
);
CREATE UNIQUE INDEX devolucoes_referencia_unica ON public.devolucoes (empresa_id, produto_id, lower(referencia)) WHERE referencia IS NOT NULL AND referencia <> '';

CREATE TABLE public.devolucao_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devolucao_id uuid NOT NULL REFERENCES public.devolucoes(id) ON DELETE CASCADE,
  acao text NOT NULL,
  detalhe text NOT NULL DEFAULT '',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.devolucoes TO authenticated;
GRANT ALL ON public.devolucoes TO service_role;
GRANT SELECT ON public.devolucao_movimentos TO authenticated;
GRANT ALL ON public.devolucao_movimentos TO service_role;

ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucao_movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê devoluções" ON public.devolucoes FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin cria devoluções" ON public.devolucoes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by = auth.uid() AND estoque_lancado_at IS NULL AND status <> 'finalizada');
CREATE POLICY "Admin edita devoluções abertas" ON public.devolucoes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin') AND estoque_lancado_at IS NULL) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin apaga devoluções sem estoque lançado" ON public.devolucoes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND estoque_lancado_at IS NULL);
CREATE POLICY "Admin vê histórico de devoluções" ON public.devolucao_movimentos FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.validar_devolucao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_emp uuid; v_rot text;
BEGIN
  SELECT m.empresa_id INTO v_emp FROM public.produtos p JOIN public.marcas m ON m.id = p.marca_id WHERE p.id = NEW.produto_id;
  IF NOT FOUND OR v_emp <> NEW.empresa_id THEN RAISE EXCEPTION 'O produto não pertence à empresa da devolução'; END IF;
  IF current_setting('app.devolucao_lancando', true) IS DISTINCT FROM '1' THEN
    IF TG_OP = 'UPDATE' AND (NEW.estoque_lancado_at IS DISTINCT FROM OLD.estoque_lancado_at OR NEW.estoque_lancado_by IS DISTINCT FROM OLD.estoque_lancado_by) THEN
      RAISE EXCEPTION 'O retorno ao estoque só pode ser feito pela confirmação.';
    END IF;
    IF NEW.status = 'finalizada' AND NEW.condicao = 'apto' AND NEW.estoque_lancado_at IS NULL THEN
      RAISE EXCEPTION 'Confirme o retorno ao estoque para finalizar uma devolução apta.';
    END IF;
  END IF;
  IF NEW.status = 'aprovada' AND NEW.condicao <> 'apto' THEN
    RAISE EXCEPTION 'Só produtos aptos para revenda podem ser aprovados para estoque.';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.estoque_lancado_at IS NOT NULL AND (NEW.quantidade <> OLD.quantidade OR NEW.produto_id <> OLD.produto_id) THEN
    RAISE EXCEPTION 'Devolução já lançada no estoque não pode ser alterada.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validar_devolucao_antes BEFORE INSERT OR UPDATE ON public.devolucoes FOR EACH ROW EXECUTE FUNCTION public.validar_devolucao();

CREATE OR REPLACE FUNCTION public.registrar_movimento_devolucao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.devolucao_movimentos (devolucao_id, acao, detalhe) VALUES (NEW.id, 'registrada', NEW.quantidade || ' un. · ' || NEW.origem);
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.devolucao_movimentos (devolucao_id, acao, detalhe) VALUES (NEW.id, 'status', OLD.status || ' → ' || NEW.status);
    END IF;
    IF NEW.condicao IS DISTINCT FROM OLD.condicao THEN
      INSERT INTO public.devolucao_movimentos (devolucao_id, acao, detalhe) VALUES (NEW.id, 'condicao', OLD.condicao || ' → ' || NEW.condicao);
    END IF;
    IF NEW.quantidade IS DISTINCT FROM OLD.quantidade THEN
      INSERT INTO public.devolucao_movimentos (devolucao_id, acao, detalhe) VALUES (NEW.id, 'quantidade', OLD.quantidade || ' → ' || NEW.quantidade);
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER registrar_movimento_devolucao_depois AFTER INSERT OR UPDATE ON public.devolucoes FOR EACH ROW EXECUTE FUNCTION public.registrar_movimento_devolucao();

CREATE OR REPLACE FUNCTION public.confirmar_retorno_devolucao(_devolucao_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v public.devolucoes;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas administradores podem lançar no estoque.' USING ERRCODE='42501'; END IF;
  SELECT * INTO v FROM public.devolucoes WHERE id = _devolucao_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Devolução não encontrada' USING ERRCODE='P0002'; END IF;
  IF v.estoque_lancado_at IS NOT NULL THEN RAISE EXCEPTION 'Esta devolução já voltou ao estoque.' USING ERRCODE='22023'; END IF;
  IF v.condicao <> 'apto' OR v.status <> 'aprovada' THEN
    RAISE EXCEPTION 'Só devoluções aptas e aprovadas para estoque podem voltar ao estoque.' USING ERRCODE='22023';
  END IF;
  PERFORM set_config('app.devolucao_lancando','1',true);
  UPDATE public.produtos SET estoque = estoque + v.quantidade WHERE id = v.produto_id;
  UPDATE public.devolucoes SET status='finalizada', estoque_lancado_at=now(), estoque_lancado_by=auth.uid() WHERE id = v.id;
  INSERT INTO public.devolucao_movimentos (devolucao_id, acao, detalhe) VALUES (v.id, 'estoque', '+' || v.quantidade || ' un. no estoque físico');
  PERFORM set_config('app.devolucao_lancando','',true);
  RETURN jsonb_build_object('id', v.id, 'status', 'finalizada');
END $$;
REVOKE EXECUTE ON FUNCTION public.confirmar_retorno_devolucao(uuid) FROM anon;