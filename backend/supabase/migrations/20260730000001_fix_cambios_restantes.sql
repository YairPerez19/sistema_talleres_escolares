-- Migration: Fix profiles.cambios_restantes column
-- Fixes: "column 'cambios_restantes' does not exist" error on baja

-- 1. Add column if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cambios_restantes int DEFAULT 3;

-- 2. Add inscripcion_limite if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS inscripcion_limite timestamptz DEFAULT (now() + interval '3 weeks');

-- 3. Set default values for existing rows that have NULL
UPDATE public.profiles 
SET 
  cambios_restantes = COALESCE(cambios_restantes, 3),
  inscripcion_limite = COALESCE(inscripcion_limite, now() + interval '3 weeks')
WHERE cambios_restantes IS NULL OR inscripcion_limite IS NULL;

-- 4. Recreate the dar_baja_taller function to be robust
CREATE OR REPLACE FUNCTION public.dar_baja_taller(p_alumno_id uuid, p_taller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cambios_nuevos int;
  v_taller_nombre text;
  v_inscripcion_exists boolean;
BEGIN
  -- Check if inscription exists
  SELECT EXISTS(
    SELECT 1 FROM public.inscripciones 
    WHERE alumno_id = p_alumno_id AND taller_id = p_taller_id
  ) INTO v_inscripcion_exists;

  IF NOT v_inscripcion_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'No se encontro la inscripcion');
  END IF;

  -- Get taller name before deleting
  SELECT nombre INTO v_taller_nombre 
  FROM public.talleres 
  WHERE id = p_taller_id;

  -- Delete inscription (this will also trigger handle_inscripcion_change)
  DELETE FROM public.inscripciones
  WHERE alumno_id = p_alumno_id AND taller_id = p_taller_id;

  -- Get the new cambios_restantes value
  SELECT COALESCE(cambios_restantes, 3) INTO v_cambios_nuevos
  FROM public.profiles
  WHERE id = p_alumno_id;

  RETURN jsonb_build_object(
    'success', true,
    'cambios_restantes', v_cambios_nuevos,
    'taller_nombre', v_taller_nombre
  );
END;
$$;

-- 5. Ensure the trigger function exists and is correct
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

-- 6. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_inscripcion_deleted ON public.inscripciones;
CREATE TRIGGER on_inscripcion_deleted
  AFTER DELETE ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.handle_inscripcion_change();
