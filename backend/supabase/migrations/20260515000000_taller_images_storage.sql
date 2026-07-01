
-- Crear bucket para imágenes de talleres si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('taller-images', 'taller-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acceso para el bucket de imágenes
CREATE POLICY "Imágenes de talleres son públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'taller-images');

CREATE POLICY "Admins pueden subir imágenes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'taller-images' AND
  (SELECT public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Admins pueden borrar imágenes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'taller-images' AND
  (SELECT public.has_role(auth.uid(), 'admin'))
);
