-- ============================================================
-- Fix: Habilitar rol Instructor (tolerante a tablas faltantes)
-- Ejecuta en Supabase Studio → SQL Editor
-- ============================================================

-- 1. Extender el enum app_role con 'instructor'
DO $$ BEGIN
  BEGIN
    ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'instructor';
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 2. Recrear la función has_role
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, text)    CASCADE;

CREATE OR REPLACE FUNCTION public.has_role(p_user uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user AND role = p_role
  );
$$;

-- 3. Tabla de instructores (si no existe)
CREATE TABLE IF NOT EXISTS public.instructores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  especialidad text,
  telefono text,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.instructores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Instructor puede ver su fila" ON public.instructores;
CREATE POLICY "Instructor puede ver su fila"
  ON public.instructores FOR SELECT
  USING (auth.uid() = public.instructores.user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin gestiona instructores" ON public.instructores;
CREATE POLICY "Admin gestiona instructores"
  ON public.instructores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Columna instructor_id en talleres (la que falta)
ALTER TABLE public.talleres
  ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. Policy: instructor ve sus talleres
DROP POLICY IF EXISTS "Instructor ve sus talleres" ON public.talleres;
CREATE POLICY "Instructor ve sus talleres"
  ON public.talleres FOR SELECT
  USING (
    public.talleres.instructor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'student')
  );

-- 6. Policy: instructor ve inscripciones de sus talleres
DO $$ BEGIN
  DROP POLICY IF EXISTS "Instructor ve inscripciones de sus talleres" ON public.inscripciones;
  CREATE POLICY "Instructor ve inscripciones de sus talleres"
    ON public.inscripciones FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.talleres t
        WHERE t.id = public.inscripciones.taller_id
          AND t.instructor_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
      OR auth.uid() = public.inscripciones.alumno_id
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 7. Policy: instructor ve profiles de sus alumnos
DO $$ BEGIN
  DROP POLICY IF EXISTS "Instructor ve profiles de sus alumnos" ON public.profiles;
  CREATE POLICY "Instructor ve profiles de sus alumnos"
    ON public.profiles FOR SELECT
    USING (
      auth.uid() = public.profiles.id
      OR public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.inscripciones i
        JOIN public.talleres t ON t.id = i.taller_id
        WHERE i.alumno_id = public.profiles.id
          AND t.instructor_id = auth.uid()
      )
    );
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 8. Policy: instructor ve las asistencias de sus talleres (opcional)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Instructor ve asistencias de sus talleres" ON public.asistencias;
  CREATE POLICY "Instructor ve asistencias de sus talleres"
    ON public.asistencias FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.talleres t
        WHERE t.id = public.asistencias.taller_id
          AND t.instructor_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin')
      OR auth.uid() = public.asistencias.alumno_id
    );
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Tabla public.asistencias no existe; se omite la policy.';
END $$;
