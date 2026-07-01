CREATE TABLE public.sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id uuid REFERENCES public.talleres(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  creado_en timestamptz DEFAULT now()
);

ALTER TABLE public.sesiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sesiones are viewable by everyone."
  ON public.sesiones FOR SELECT USING (true);
CREATE POLICY "Sesiones can be managed by admins."
  ON public.sesiones FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.asistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id uuid REFERENCES public.sesiones(id) ON DELETE CASCADE,
  alumno_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  estado text NOT NULL CHECK (estado IN ('presente', 'ausente')),
  justificada boolean DEFAULT false,
  UNIQUE(sesion_id, alumno_id)
);

ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Asistencias viewable by owner or admin."
  ON public.asistencias FOR SELECT USING (auth.uid() = alumno_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Asistencias managed by admin."
  ON public.asistencias FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- View to calculate total debt
CREATE OR REPLACE VIEW public.deuda_alumnos AS
SELECT 
  a.alumno_id,
  SUM(
    CASE 
      WHEN a.estado = 'presente' THEN 25
      WHEN a.estado = 'ausente' AND a.justificada = false THEN 25
      ELSE 0
    END
  ) as deuda_total
FROM public.asistencias a
GROUP BY a.alumno_id;
