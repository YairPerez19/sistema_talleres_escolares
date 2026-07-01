-- Migration to add enrollment change limits and time constraints

-- Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cambios_restantes int DEFAULT 3,
ADD COLUMN IF NOT EXISTS inscripcion_limite timestamptz DEFAULT (now() + interval '3 weeks');

-- Function to handle enrollment changes
CREATE OR REPLACE FUNCTION public.handle_inscripcion_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If a student leaves a workshop (DELETE), decrement their remaining changes
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.profiles
    SET cambios_restantes = cambios_restantes - 1
    WHERE id = OLD.alumno_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Trigger for when a student leaves a workshop
DROP TRIGGER IF EXISTS on_inscripcion_deleted ON public.inscripciones;
CREATE TRIGGER on_inscripcion_deleted
  AFTER DELETE ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.handle_inscripcion_change();

-- Update enrollment prevention logic
CREATE OR REPLACE FUNCTION public.check_inscripcion_constraints()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cambios int;
  v_limite timestamptz;
BEGIN
  -- Get user constraints
  SELECT cambios_restantes, inscripcion_limite 
  INTO v_cambios, v_limite
  FROM public.profiles
  WHERE id = NEW.alumno_id;

  -- Check if time limit has passed
  IF now() > v_limite THEN
    RAISE EXCEPTION 'El periodo de inscripciones ha finalizado (límite de 3 semanas excedido)';
  END IF;

  -- Check if changes are remaining
  IF v_cambios <= 0 THEN
    RAISE EXCEPTION 'Has agotado tus 3 oportunidades de cambio de taller';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to check constraints before insertion
DROP TRIGGER IF EXISTS check_inscripcion_constraints_trigger ON public.inscripciones;
CREATE TRIGGER check_inscripcion_constraints_trigger
  BEFORE INSERT ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.check_inscripcion_constraints();

-- Ensure admin has full access to talleres
CREATE POLICY "Admins can do everything with talleres" 
ON public.talleres 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure admin can do everything with horarios
CREATE POLICY "Admins can do everything with horarios" 
ON public.horarios 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
