-- ============================================================
-- Migración: Admin ALL policies en profiles, user_roles, inscripciones
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "Admin acceso total a profiles" ON public.profiles;
CREATE POLICY "Admin acceso total a profiles"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles
DROP POLICY IF EXISTS "Admin gestiona roles" ON public.user_roles;
CREATE POLICY "Admin gestiona roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- inscripciones
DROP POLICY IF EXISTS "Admin gestiona inscripciones" ON public.inscripciones;
CREATE POLICY "Admin gestiona inscripciones"
  ON public.inscripciones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
