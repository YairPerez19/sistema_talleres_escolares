-- ============================================================
-- Migración: Instructor policies en talleres, horarios, sesiones
--              e inscripciones
-- ============================================================

-- talleres: instructor gestiona sus propios talleres
DROP POLICY IF EXISTS "Instructor gestiona sus talleres" ON public.talleres;
CREATE POLICY "Instructor gestiona sus talleres"
  ON public.talleres FOR INSERT
  WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Instructor actualiza sus talleres" ON public.talleres;
CREATE POLICY "Instructor actualiza sus talleres"
  ON public.talleres FOR UPDATE
  USING (instructor_id = auth.uid())
  WITH CHECK (instructor_id = auth.uid());

DROP POLICY IF EXISTS "Instructor elimina sus talleres" ON public.talleres;
CREATE POLICY "Instructor elimina sus talleres"
  ON public.talleres FOR DELETE
  USING (instructor_id = auth.uid());

-- horarios: instructor gestiona horarios de sus talleres
DROP POLICY IF EXISTS "Instructor gestiona horarios de sus talleres" ON public.horarios;
CREATE POLICY "Instructor gestiona horarios de sus talleres"
  ON public.horarios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = taller_id AND t.instructor_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = taller_id AND t.instructor_id = auth.uid()
    )
  );

-- sesiones (legacy)
DROP POLICY IF EXISTS "Instructor gestiona sesiones de sus talleres" ON public.sesiones;
CREATE POLICY "Instructor gestiona sesiones de sus talleres"
  ON public.sesiones FOR ALL
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

-- inscripciones: instructor puede inscribir/dar de baja en sus talleres
DROP POLICY IF EXISTS "Instructor inscribe en sus talleres" ON public.inscripciones;
CREATE POLICY "Instructor inscribe en sus talleres"
  ON public.inscripciones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = taller_id AND t.instructor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Instructor da de baja de sus talleres" ON public.inscripciones;
CREATE POLICY "Instructor da de baja de sus talleres"
  ON public.inscripciones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.talleres t
      WHERE t.id = taller_id AND t.instructor_id = auth.uid()
    )
  );
