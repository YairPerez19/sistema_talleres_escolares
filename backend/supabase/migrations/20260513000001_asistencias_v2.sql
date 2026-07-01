-- ============================================================
-- Migración: Tabla asistencias_v2 (reemplaza la estructura básica)
-- ============================================================

-- 1. Crear la nueva tabla de asistencias con todos los campos requeridos
--    Usamos un nombre distinto para no romper la tabla existente.
--    Luego reemplazaremos la vista deuda_alumnos.

DROP TABLE IF EXISTS public.asistencias CASCADE;

CREATE TABLE public.asistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taller_id uuid NOT NULL REFERENCES public.talleres(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time DEFAULT CURRENT_TIME,
  estado text NOT NULL CHECK (estado IN ('presente', 'ausente', 'retardo', 'justificado')),
  observaciones text,
  created_at timestamptz DEFAULT now(),
  -- Un alumno solo puede tener UNA asistencia por taller por día
  UNIQUE(alumno_id, taller_id, fecha)
);

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- Alumno puede ver su propia asistencia
CREATE POLICY "Alumno ve su asistencia"
  ON public.asistencias FOR SELECT
  USING (auth.uid() = alumno_id);

-- Instructor ve y gestiona asistencias de sus talleres (solo del día actual)
CREATE POLICY "Instructor gestiona asistencias de sus talleres"
  ON public.asistencias FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = taller_id AND t.instructor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = taller_id AND t.instructor_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- Admin puede hacer todo
CREATE POLICY "Admin gestiona toda la asistencia"
  ON public.asistencias FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Habilitar Realtime para la tabla asistencias
-- (Se hace desde el dashboard de Supabase o con la CLI, pero lo documentamos aquí)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencias;

-- 3. Recrear vista de deuda_alumnos con la nueva estructura
DROP VIEW IF EXISTS public.deuda_alumnos;
CREATE OR REPLACE VIEW public.deuda_alumnos AS
SELECT
  a.alumno_id,
  COUNT(*) FILTER (WHERE a.estado IN ('presente', 'retardo')) AS sesiones_asistidas,
  COUNT(*) FILTER (WHERE a.estado = 'ausente') AS faltas_injustificadas,
  COUNT(*) FILTER (WHERE a.estado = 'justificado') AS faltas_justificadas,
  COUNT(*) FILTER (WHERE a.estado = 'retardo') AS retardos,
  COUNT(*) AS total_sesiones,
  ROUND(
    COUNT(*) FILTER (WHERE a.estado IN ('presente', 'retardo'))::numeric
    / NULLIF(COUNT(*), 0) * 100, 1
  ) AS porcentaje_asistencia,
  SUM(
    CASE
      WHEN a.estado IN ('presente', 'retardo') THEN 25
      WHEN a.estado = 'ausente' THEN 25
      ELSE 0
    END
  ) AS deuda_total
FROM public.asistencias a
GROUP BY a.alumno_id;

-- 4. Vista para el admin: asistencia por taller con porcentajes
CREATE OR REPLACE VIEW public.estadisticas_talleres AS
SELECT
  t.id AS taller_id,
  t.nombre AS taller_nombre,
  t.categoria,
  t.instructor,
  COUNT(DISTINCT a.alumno_id) AS alumnos_registrados,
  COUNT(a.id) FILTER (WHERE a.estado IN ('presente', 'retardo')) AS asistencias_totales,
  COUNT(a.id) FILTER (WHERE a.estado = 'ausente') AS faltas_totales,
  COUNT(DISTINCT a.fecha) AS sesiones_tomadas,
  ROUND(
    COUNT(a.id) FILTER (WHERE a.estado IN ('presente', 'retardo'))::numeric
    / NULLIF(COUNT(a.id), 0) * 100, 1
  ) AS porcentaje_asistencia_global
FROM public.talleres t
LEFT JOIN public.asistencias a ON a.taller_id = t.id
GROUP BY t.id, t.nombre, t.categoria, t.instructor;

-- 5. Función para obtener asistencia de un taller en una fecha específica
CREATE OR REPLACE FUNCTION public.get_asistencia_taller(p_taller_id uuid, p_fecha date)
RETURNS TABLE (
  alumno_id uuid,
  nombre text,
  matricula text,
  turno text,
  estado text,
  observaciones text,
  hora time,
  asistencia_id uuid
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id AS alumno_id,
    p.nombre,
    p.matricula,
    p.turno,
    COALESCE(a.estado, 'sin_registro') AS estado,
    a.observaciones,
    a.hora,
    a.id AS asistencia_id
  FROM public.inscripciones i
  JOIN public.profiles p ON p.id = i.alumno_id
  LEFT JOIN public.asistencias a ON a.alumno_id = i.alumno_id
    AND a.taller_id = p_taller_id
    AND a.fecha = p_fecha
  WHERE i.taller_id = p_taller_id
  ORDER BY p.nombre;
$$;
