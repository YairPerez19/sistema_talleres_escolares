-- Update handle_new_user to assign default 'student' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, nombre, matricula, turno, cambios_restantes, inscripcion_limite)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'matricula',
    new.raw_user_meta_data->>'turno',
    3, -- Default changes
    (now() + interval '3 weeks') -- Default deadline
  );

  -- Insert into user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');

  RETURN new;
END;
$$;
