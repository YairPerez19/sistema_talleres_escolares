-- ============================================================
-- Mejoras: RLS estricto, índices, settings, audit log, RPCs
-- Idempotente: seguro de re-ejecutar
-- ============================================================

-- ============================================================
-- 1. Fix RLS: Instructor SOLO ve asistencias de sus propios talleres
--    Se elimina el fallback has_role('instructor') que permitía ver todo
-- ============================================================

DROP POLICY IF EXISTS "Instructor ve asistencias de sus talleres" ON public.asistencias;
CREATE POLICY "Instructor ve asistencias de sus talleres"
  ON public.asistencias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = public.asistencias.taller_id
        AND t.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Instructor gestiona asistencias de sus talleres" ON public.asistencias;
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

-- ============================================================
-- 2. Usuario puede leer su propio rol desde user_roles
-- ============================================================

DROP POLICY IF EXISTS "Usuario ve su propio rol" ON public.user_roles;
CREATE POLICY "Usuario ve su propio rol"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. Usuario puede leer su propio perfil
-- ============================================================

DROP POLICY IF EXISTS "Usuario ve su perfil" ON public.profiles;
CREATE POLICY "Usuario ve su perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- ============================================================
-- 4. Índices para mejorar rendimiento
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_asistencias_taller_fecha ON public.asistencias(taller_id, fecha);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumno ON public.asistencias(alumno_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_alumno ON public.inscripciones(alumno_id);
CREATE INDEX IF NOT EXISTS idx_inscripciones_taller ON public.inscripciones(taller_id);
CREATE INDEX IF NOT EXISTS idx_horarios_taller ON public.horarios(taller_id);
CREATE INDEX IF NOT EXISTS idx_talleres_instructor ON public.talleres(instructor_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha ON public.asistencias(fecha);

-- ============================================================
-- 5. Costo por sesión configurable desde tabla settings
-- ============================================================

-- 5a. Tabla settings
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona settings" ON public.settings;
CREATE POLICY "Admin gestiona settings"
  ON public.settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Usuario lee settings" ON public.settings;
CREATE POLICY "Usuario lee settings"
  ON public.settings FOR SELECT
  USING (true);

-- 5b. Valor por defecto
INSERT INTO public.settings (key, value) VALUES ('costo_por_sesion', '25')
ON CONFLICT (key) DO NOTHING;

-- 5c. Vista deuda_alumnos usando settings table en lugar de valor hardcodeado
CREATE OR REPLACE VIEW public.deuda_alumnos AS
SELECT
  a.alumno_id,
  COUNT(*) FILTER (WHERE a.estado IN ('presente', 'retardo')) AS sesiones_asistidas,
  COUNT(*) FILTER (WHERE a.estado = 'ausente') AS faltas_injustificadas,
  SUM(CASE WHEN a.estado IN ('presente', 'retardo', 'ausente')
    THEN (SELECT COALESCE(NULLIF(value, ''), '25')::int FROM public.settings WHERE key = 'costo_por_sesion')
    ELSE 0 END) AS deuda_total
FROM public.asistencias a
GROUP BY a.alumno_id;

-- ============================================================
-- 6. Tabla audit_log para trazabilidad
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin ve audit_log" ON public.audit_log;
CREATE POLICY "Admin ve audit_log"
  ON public.audit_log FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Sistema inserta audit_log" ON public.audit_log;
CREATE POLICY "Sistema inserta audit_log"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- 7. Función get_admin_stats(): todas las estadísticas en una sola llamada
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'total_sesiones', (SELECT COUNT(*) FROM public.asistencias),
  'sesiones_hoy', (SELECT COUNT(*) FROM public.asistencias WHERE fecha = CURRENT_DATE),
  'sesiones_ayer', (SELECT COUNT(*) FROM public.asistencias WHERE fecha = CURRENT_DATE - INTERVAL '1 day'),
  'talleres_activos', (SELECT COUNT(*) FROM public.talleres),
  'promedio_asistencia', COALESCE(
    (SELECT ROUND(
      COUNT(*) FILTER (WHERE estado IN ('presente', 'retardo'))::numeric /
      NULLIF(COUNT(*), 0) * 100
    ) FROM public.asistencias WHERE fecha >= CURRENT_DATE - INTERVAL '6 days'),
    0
  ),
  'promedio_semana_pasada', COALESCE(
    (SELECT ROUND(
      COUNT(*) FILTER (WHERE estado IN ('presente', 'retardo'))::numeric /
      NULLIF(COUNT(*), 0) * 100
    ) FROM public.asistencias WHERE fecha BETWEEN CURRENT_DATE - INTERVAL '13 days' AND CURRENT_DATE - INTERVAL '7 days'),
    0
  )
);
$$;

-- ============================================================
-- 8. Función get_mi_asistencia(): historial de asistencia del alumno
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_mi_asistencia(p_alumno_id uuid)
RETURNS TABLE (
  taller_id uuid,
  taller_nombre text,
  fecha date,
  estado text,
  observaciones text,
  hora time
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.taller_id,
    t.nombre AS taller_nombre,
    a.fecha,
    a.estado,
    a.observaciones,
    a.hora
  FROM public.asistencias a
  JOIN public.talleres t ON t.id = a.taller_id
  WHERE a.alumno_id = p_alumno_id
  ORDER BY a.fecha DESC, t.nombre;
$$;
