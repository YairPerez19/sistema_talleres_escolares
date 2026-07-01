-- Force update existing profiles to have the default constraints
UPDATE public.profiles 
SET 
  cambios_restantes = 3, 
  inscripcion_limite = now() + interval '3 weeks'
WHERE cambios_restantes IS NULL;

-- Also ensure all users have the 'student' role if they don't have one
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'student'::app_role 
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id
)
ON CONFLICT DO NOTHING;
