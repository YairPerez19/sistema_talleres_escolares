-- ============================================================
-- Migración: storage.objects UPDATE policy + realtime para
--              asistencias
-- ============================================================

-- storage.objects — UPDATE de imágenes de talleres
--     (SELECT, INSERT y DELETE ya existen en migración previa)
DROP POLICY IF EXISTS "Admins pueden actualizar imágenes" ON storage.objects;
CREATE POLICY "Admins pueden actualizar imágenes"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'taller-images'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'taller-images'
    AND public.has_role(auth.uid(), 'admin')
  );

-- habilitar realtime para asistencias (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'asistencias'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.asistencias;
  END IF;
END;
$$;
