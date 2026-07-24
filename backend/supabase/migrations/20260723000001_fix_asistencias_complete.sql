-- ============================================================
-- Fix: Sistema de asistencias completo (tolerante a re-ejecución)
-- Ejecuta en Supabase Studio → SQL Editor
-- ============================================================

-- 1. Tabla de asistencias
CREATE TABLE IF NOT EXISTS public.asistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taller_id uuid NOT NULL REFERENCES public.talleres(id) ON DELETE CASCADE,
  instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora time DEFAULT CURRENT_TIME,
  estado text NOT NULL CHECK (estado IN ('presente', 'ausente', 'retardo', 'justificado')),
  observaciones text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alumno_id, taller_id, fecha)
);

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;

-- Policies mínimas para que la app funcione
DROP POLICY IF EXISTS "Alumno ve su asistencia"          ON public.asistencias;
DROP POLICY IF EXISTS "Admin ve todas las asistencias"   ON public.asistencias;
DROP POLICY IF EXISTS "Instructor ve sus asistencias"    ON public.asistencias;
DROP POLICY IF EXISTS "Instructor ve asistencias de sus talleres" ON public.asistencias;
DROP POLICY IF EXISTS "Admin gestiona todas las asistencias"      ON public.asistencias;

CREATE POLICY "Alumno ve su asistencia"
  ON public.asistencias FOR SELECT
  USING (auth.uid() = alumno_id);

CREATE POLICY "Admin ve todas las asistencias"
  ON public.asistencias FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Instructor ve asistencias de sus talleres"
  ON public.asistencias FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = public.asistencias.taller_id
        AND t.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Admin gestiona todas las asistencias"
  ON public.asistencias FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Vista deuda_alumnos
CREATE OR REPLACE VIEW public.deuda_alumnos AS
SELECT
  a.alumno_id,
  COUNT(*) FILTER (WHERE a.estado IN ('presente', 'retardo'))   AS sesiones_asistidas,
  COUNT(*) FILTER (WHERE a.estado = 'ausente')                   AS faltas_injustificadas,
  SUM(CASE WHEN a.estado IN ('presente', 'retardo', 'ausente') THEN 25 ELSE 0 END) AS deuda_total
FROM public.asistencias a
GROUP BY a.alumno_id;

-- 3. Función get_asistencia_taller
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
SET search_path = public
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
  LEFT JOIN public.asistencias a
    ON a.alumno_id = i.alumno_id
   AND a.taller_id = p_taller_id
   AND a.fecha = p_fecha
  WHERE i.taller_id = p_taller_id
  ORDER BY p.nombre;
$$;

-- 4. Trigger: al borrar inscripción, descontar cambios_restantes
CREATE OR REPLACE FUNCTION public.handle_inscripcion_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles
    SET cambios_restantes = GREATEST(COALESCE(cambios_restantes, 3) - 1, 0)
    WHERE id = OLD.alumno_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_inscripcion_deleted ON public.inscripciones;
CREATE TRIGGER on_inscripcion_deleted
  AFTER DELETE ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.handle_inscripcion_change();

-- 5. Trigger: bloquear inscripción si no quedan cambios o venció el plazo
CREATE OR REPLACE FUNCTION public.check_inscripcion_constraints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cambios int;
  v_limite timestamptz;
BEGIN
  SELECT cambios_restantes, inscripcion_limite
    INTO v_cambios, v_limite
  FROM public.profiles
  WHERE id = NEW.alumno_id;

  IF v_limite IS NOT NULL AND now() > v_limite THEN
    RAISE EXCEPTION 'El periodo de inscripciones ha finalizado';
  END IF;

  IF COALESCE(v_cambios, 0) <= 0 THEN
    RAISE EXCEPTION 'Has agotado tus 3 oportunidades de cambio de taller';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_inscripcion_constraints_trigger ON public.inscripciones;
CREATE TRIGGER check_inscripcion_constraints_trigger
  BEFORE INSERT ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.check_inscripcion_constraints();

-- 6. RPC: dar de baja (atómico: DELETE + UPDATE cambios_restantes)
CREATE OR REPLACE FUNCTION public.dar_baja_taller(p_alumno_id uuid, p_taller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cambios_nuevos int;
  v_taller_nombre text;
BEGIN
  SELECT nombre INTO v_taller_nombre FROM public.talleres WHERE id = p_taller_id;

  DELETE FROM public.inscripciones
  WHERE alumno_id = p_alumno_id AND taller_id = p_taller_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se encontro la inscripcion');
  END IF;

  UPDATE public.profiles
  SET cambios_restantes = GREATEST(COALESCE(cambios_restantes, 3) - 1, 0)
  WHERE id = p_alumno_id
  RETURNING cambios_restantes INTO v_cambios_nuevos;

  RETURN jsonb_build_object(
    'success', true,
    'cambios_restantes', COALESCE(v_cambios_nuevos, 0),
    'taller_nombre', v_taller_nombre
  );
END;
$$;

-- 7. Trigger: validar colisión de horarios al inscribir
CREATE OR REPLACE FUNCTION public.check_inscripcion_colision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conflicto int;
BEGIN
  SELECT COUNT(*) INTO conflicto
  FROM public.inscripciones i
  JOIN public.horarios hn ON hn.taller_id = NEW.taller_id
  JOIN public.horarios ho ON ho.taller_id = i.taller_id
  WHERE i.alumno_id = NEW.alumno_id
    AND hn.dia = ho.dia
    AND hn.hora_inicio < ho.hora_fin
    AND hn.hora_fin   > ho.hora_inicio;

  IF conflicto > 0 THEN
    RAISE EXCEPTION 'Conflicto de horario con otro taller ya inscrito';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_inscripcion_colision_trigger ON public.inscripciones;
CREATE TRIGGER check_inscripcion_colision_trigger
  BEFORE INSERT ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.check_inscripcion_colision();
