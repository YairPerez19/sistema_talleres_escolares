-- ============================================================
-- Fix: RLS Policy para guardar y gestionar asistencias por instructores y admins
-- Ejecutar en Supabase Studio -> SQL Editor si no usas supabase cli
-- ============================================================

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas antiguas o restrictivas en asistencias
DROP POLICY IF EXISTS "Alumno ve su asistencia"                     ON public.asistencias;
DROP POLICY IF EXISTS "Admin ve todas las asistencias"              ON public.asistencias;
DROP POLICY IF EXISTS "Instructor ve sus asistencias"               ON public.asistencias;
DROP POLICY IF EXISTS "Instructor ve asistencias de sus talleres"   ON public.asistencias;
DROP POLICY IF EXISTS "Instructor gestiona asistencias de sus talleres" ON public.asistencias;
DROP POLICY IF EXISTS "Admin gestiona todas las asistencias"         ON public.asistencias;

-- 1. Alumno ve su propia asistencia
CREATE POLICY "Alumno ve su asistencia"
  ON public.asistencias FOR SELECT
  USING (auth.uid() = alumno_id);

-- 2. Admin ve todas las asistencias
CREATE POLICY "Admin ve todas las asistencias"
  ON public.asistencias FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Instructor ve asistencias de sus talleres (o si posee el rol instructor/admin)
CREATE POLICY "Instructor ve asistencias de sus talleres"
  ON public.asistencias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = public.asistencias.taller_id
        AND t.instructor_id = auth.uid()
    )
  );

-- 4. Admin gestiona todas las asistencias
CREATE POLICY "Admin gestiona todas las asistencias"
  ON public.asistencias FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Instructor gestiona (INSERT, UPDATE, DELETE) asistencias de sus talleres
CREATE POLICY "Instructor gestiona asistencias de sus talleres"
  ON public.asistencias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = public.asistencias.taller_id
        AND t.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = public.asistencias.taller_id
        AND t.instructor_id = auth.uid()
    )
  );
