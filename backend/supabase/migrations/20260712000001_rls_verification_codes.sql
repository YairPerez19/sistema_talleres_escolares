-- ============================================================
-- FIX CRÍTICO: verification_codes — bloquear acceso directo
--    El backend maneja esta tabla vía service_role key.
--    Los clientes NUNCA deben poder leer/escribir códigos.
-- ============================================================
DROP POLICY IF EXISTS "Service role only - verification_codes" ON public.verification_codes;
CREATE POLICY "Service role only - verification_codes"
  ON public.verification_codes
  FOR ALL
  USING (false)
  WITH CHECK (false);
