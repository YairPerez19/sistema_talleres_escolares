-- ============================================================
-- Migración: Rol Instructor + Tabla instructores
-- ============================================================

-- 1. Extender el enum app_role para incluir 'instructor'
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'instructor';

-- 2. Tabla de instructores (vincula user_id con sus datos extra)
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

-- Instructores pueden leer su propia fila
CREATE POLICY "Instructor puede ver su fila"
  ON public.instructores FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Solo admin puede gestionar instructores
CREATE POLICY "Admin gestiona instructores"
  ON public.instructores FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Columna instructor_id en talleres (FK a instructores.user_id)
ALTER TABLE public.talleres
  ADD COLUMN IF NOT EXISTS instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Tabla de relación instructor_talleres (por si un instructor
--    tiene varios talleres — actualmente talleres.instructor es texto)
-- No es necesaria una tabla pivot porque talleres.instructor_id es suficiente
-- para el modelo 1 instructor → N talleres.

-- 5. Política para que instructor pueda ver SUS talleres asignados
CREATE POLICY "Instructor ve sus talleres"
  ON public.talleres FOR SELECT
  USING (
    instructor_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'student')
  );

-- 6. Política para que instructor pueda leer inscripciones de sus talleres
CREATE POLICY "Instructor ve inscripciones de sus talleres"
  ON public.inscripciones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = taller_id AND t.instructor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
    OR auth.uid() = alumno_id
  );

-- 7. Instructor puede ver profiles de alumnos inscritos en sus talleres
CREATE POLICY "Instructor ve profiles de sus alumnos"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.inscripciones i
      JOIN public.talleres t ON t.id = i.taller_id
      WHERE i.alumno_id = id AND t.instructor_id = auth.uid()
    )
  );

-- 8. También necesita ver user_roles
CREATE POLICY "Instructor y admin ven roles"
  ON public.user_roles FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );
