-- ============================================================
-- SCRIPT DE CONFIGURACIÓN INTEGRAL SITE - CBTIS No. 61
-- ============================================================

-- 1. TABLAS BASE
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  matricula text NOT NULL,
  turno text NOT NULL CHECK (turno IN ('matutino', 'vespertino')),
  cambios_restantes int DEFAULT 3,
  inscripcion_limite timestamptz DEFAULT (now() + interval '3 weeks'),
  created_at timestamptz DEFAULT now()
);

-- Asegurar que las columnas existan en caso de que la tabla ya hubiera sido creada previamente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cambios_restantes int DEFAULT 3;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inscripcion_limite timestamptz DEFAULT (now() + interval '3 weeks');


CREATE TABLE IF NOT EXISTS public.talleres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text NOT NULL,
  lugar text NOT NULL,
  instructor text NOT NULL,
  instructor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  descripcion text,
  cupo int DEFAULT 30,
  imagen_url text
);

CREATE TABLE IF NOT EXISTS public.horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id uuid REFERENCES public.talleres(id) ON DELETE CASCADE,
  dia text NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL
);

CREATE TABLE IF NOT EXISTS public.inscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  taller_id uuid REFERENCES public.talleres(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alumno_id, taller_id)
);

-- 2. ROLES Y SEGURIDAD
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('admin', 'student', 'instructor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- 3. SISTEMA DE ASISTENCIAS V2
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

-- 4. VISTAS Y FUNCIONES ANALÍTICAS
CREATE OR REPLACE VIEW public.deuda_alumnos AS
SELECT
  a.alumno_id,
  COUNT(*) FILTER (WHERE a.estado IN ('presente', 'retardo')) AS sesiones_asistidas,
  COUNT(*) FILTER (WHERE a.estado = 'ausente') AS faltas_injustificadas,
  SUM(CASE WHEN a.estado IN ('presente', 'retardo', 'ausente') THEN 25 ELSE 0 END) AS deuda_total
FROM public.asistencias a
GROUP BY a.alumno_id;

CREATE OR REPLACE FUNCTION public.get_asistencia_taller(p_taller_id uuid, p_fecha date)
RETURNS TABLE (
  alumno_id uuid, nombre text, matricula text, turno text,
  estado text, observaciones text, hora time, asistencia_id uuid
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id AS alumno_id, p.nombre, p.matricula, p.turno,
    COALESCE(a.estado, 'sin_registro') AS estado,
    a.observaciones, a.hora, a.id AS asistencia_id
  FROM public.inscripciones i
  JOIN public.profiles p ON p.id = i.alumno_id
  LEFT JOIN public.asistencias a ON a.alumno_id = i.alumno_id
    AND a.taller_id = p_taller_id AND a.fecha = p_fecha
  WHERE i.taller_id = p_taller_id
  ORDER BY p.nombre;
$$;

-- Funciones de restricciones de cambios
CREATE OR REPLACE FUNCTION public.handle_inscripcion_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.check_inscripcion_constraints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cambios int;
  v_limite timestamptz;
BEGIN
  SELECT cambios_restantes, inscripcion_limite 
  INTO v_cambios, v_limite
  FROM public.profiles
  WHERE id = NEW.alumno_id;

  IF now() > v_limite THEN
    RAISE EXCEPTION 'El periodo de inscripciones ha finalizado';
  END IF;

  IF v_cambios <= 0 THEN
    RAISE EXCEPTION 'Has agotado tus 3 oportunidades de cambio de taller';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_inscripcion_constraints_trigger ON public.inscripciones;
CREATE TRIGGER check_inscripcion_constraints_trigger
  BEFORE INSERT ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.check_inscripcion_constraints();

-- RPC para dar de baja (atomico: DELETE + UPDATE cambios_restantes)
CREATE OR REPLACE FUNCTION public.dar_baja_taller(p_alumno_id uuid, p_taller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 5. SEMILLADO DE DATOS (TALLERES)
INSERT INTO public.talleres (id, nombre, categoria, lugar, instructor, cupo) 
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Teatro', 'DIFUSIÓN CULTURAL', 'Sala audiovisual', 'Alfonso Lucio Delgado', 30),
  ('11111111-1111-1111-1111-111111111112', 'Danza', 'DIFUSIÓN CULTURAL', 'Pasillo de entrada', 'Diego Guevara', 30),
  ('33333333-3333-3333-3333-333333333331', 'Futbol Varonil', 'DEPORTES', 'Campo Miguel Arroyo', 'Asignado', 30)
ON CONFLICT DO NOTHING;
