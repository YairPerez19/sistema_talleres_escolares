CREATE OR REPLACE FUNCTION public.count_inscripciones(taller_ids uuid[])
RETURNS TABLE(taller_id uuid, total bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.taller_id, COUNT(*)::bigint AS total
  FROM public.inscripciones i
  WHERE i.taller_id = ANY(taller_ids)
  GROUP BY i.taller_id;
$$;
