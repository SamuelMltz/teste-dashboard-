CREATE OR REPLACE FUNCTION public.listar_usuarios_admin()
RETURNS TABLE(id uuid, email text, criado_em timestamptz, is_admin boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem ver as contas.';
  END IF;
  RETURN QUERY
    SELECT u.id, u.email::text, u.created_at,
      EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'admin')
    FROM auth.users u ORDER BY u.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.definir_admin(_user_id uuid, _admin boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar permissões.';
  END IF;
  IF _admin THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    IF _user_id = auth.uid() THEN
      RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador.';
    END IF;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.listar_usuarios_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.definir_admin(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.definir_admin(uuid, boolean) TO authenticated;