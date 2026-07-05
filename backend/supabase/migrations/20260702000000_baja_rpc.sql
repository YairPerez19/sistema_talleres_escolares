CREATE OR REPLACE FUNCTION public.dar_baja_taller(p_alumno_id uuid, p_taller_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cambios_actuales int;
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
