CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  matricula text NOT NULL,
  turno text NOT NULL CHECK (turno IN ('matutino', 'vespertino')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by owner."
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Profiles are mutable by owner."
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, matricula, turno)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'nombre',
    new.raw_user_meta_data->>'matricula',
    new.raw_user_meta_data->>'turno'
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

CREATE TABLE public.talleres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  categoria text NOT NULL,
  lugar text NOT NULL,
  instructor text NOT NULL,
  descripcion text,
  cupo int DEFAULT 30,
  imagen_url text
);

ALTER TABLE public.talleres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Talleres are viewable by everyone."
  ON public.talleres FOR SELECT USING (true);

CREATE TABLE public.horarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id uuid REFERENCES public.talleres(id) ON DELETE CASCADE,
  dia text NOT NULL,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL
);

ALTER TABLE public.horarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Horarios are viewable by everyone."
  ON public.horarios FOR SELECT USING (true);

CREATE TABLE public.inscripciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  taller_id uuid REFERENCES public.talleres(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alumno_id, taller_id)
);

ALTER TABLE public.inscripciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Inscripciones viewable by owner."
  ON public.inscripciones FOR SELECT USING (auth.uid() = alumno_id);
CREATE POLICY "Inscripciones instertable by owner."
  ON public.inscripciones FOR INSERT WITH CHECK (auth.uid() = alumno_id);
CREATE POLICY "Inscripciones deletable by owner."
  ON public.inscripciones FOR DELETE USING (auth.uid() = alumno_id);

CREATE OR REPLACE FUNCTION public.check_inscripcion_colision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_colision boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.inscripciones i
    JOIN public.horarios h1 ON i.taller_id = h1.taller_id
    JOIN public.horarios h2 ON h2.taller_id = NEW.taller_id
    WHERE i.alumno_id = NEW.alumno_id
      AND h1.dia = h2.dia
      AND h1.hora_inicio < h2.hora_fin
      AND h1.hora_fin > h2.hora_inicio
  ) INTO v_colision;

  IF v_colision THEN
    RAISE EXCEPTION 'Colisión de horarios detectada con otro taller inscrito';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_horario_colision ON public.inscripciones;
CREATE TRIGGER prevent_horario_colision
  BEFORE INSERT ON public.inscripciones
  FOR EACH ROW EXECUTE PROCEDURE public.check_inscripcion_colision();

-- Roles table
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('admin', 'student');
CREATE TABLE public.user_roles (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  PRIMARY KEY (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Seed data for Talleres
DELETE FROM public.talleres;
INSERT INTO public.talleres (id, nombre, categoria, lugar, instructor, cupo) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Teatro', 'DIFUSIÓN CULTURAL', 'Sala audiovisual', 'Alfonso Lucio Delgado', 30),
  ('11111111-1111-1111-1111-111111111112', 'Danza', 'DIFUSIÓN CULTURAL', 'Pasillo de entrada', 'Diego Guevara', 30),
  ('11111111-1111-1111-1111-111111111113', 'Ajedrez', 'DIFUSIÓN CULTURAL', 'Biblioteca', 'Fernando Cortina Montes', 30),
  ('11111111-1111-1111-1111-111111111114', 'Oratoria y Declamación', 'DIFUSIÓN CULTURAL', 'Aula 1', 'José Luis Ortega López', 30),
  ('11111111-1111-1111-1111-111111111115', 'Rondalla', 'DIFUSIÓN CULTURAL', 'Aula 4', '(asignar)', 30),
  ('11111111-1111-1111-1111-111111111116', 'Canción', 'DIFUSIÓN CULTURAL', 'Aula 4', '(asignar)', 30),
  ('11111111-1111-1111-1111-111111111117', 'Dibujo', 'DIFUSIÓN CULTURAL', 'Aula 5', '(asignar)', 30),
  ('11111111-1111-1111-1111-111111111118', 'Fotografía', 'DIFUSIÓN CULTURAL', 'Aula 6', '(asignar)', 30),
  ('11111111-1111-1111-1111-111111111119', 'Artesanías', 'DIFUSIÓN CULTURAL', 'Aula 7', '(asignar)', 30),
  ('22222222-2222-2222-2222-222222222221', 'Banda de Guerra', 'ACTIVIDADES CÍVICAS', 'Patio cívico', '(asignar)', 30),
  ('22222222-2222-2222-2222-222222222222', 'Escolta', 'ACTIVIDADES CÍVICAS', 'Patio cívico', '(asignar)', 30),
  ('22222222-2222-2222-2222-222222222223', 'Banderas', 'ACTIVIDADES CÍVICAS', 'Patio cívico', '(asignar)', 30),
  ('33333333-3333-3333-3333-333333333331', 'Futbol Varonil', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Campo Miguel Arroyo', '(asignar)', 30),
  ('33333333-3333-3333-3333-333333333332', 'Futbol Femenil', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Campo Miguel Arroyo', '(asignar)', 30),
  ('33333333-3333-3333-3333-333333333333', 'Basquetbol', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Gimnasio 1', '(asignar)', 30),
  ('33333333-3333-3333-3333-333333333334', 'Voleibol', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Gimnasio 1', '(asignar)', 30),
  ('33333333-3333-3333-3333-333333333335', 'Handball', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Cancha exterior', '(asignar)', 30),
  ('33333333-3333-3333-3333-333333333336', 'Atletismo', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Pista Miguel Arroyo', 'Juan Carlos Santiago Loaiza', 30),
  ('33333333-3333-3333-3333-333333333337', 'Taekwondo', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Unidad dep. Miguel Arroyo', 'Aaron García', 30),
  ('33333333-3333-3333-3333-333333333338', 'Baile', 'PROMOCIÓN DEPORTIVA — MATUTINO', 'Aula 12', 'Lizeth Arely Carvajal', 30),
  ('44444444-4444-4444-4444-444444444441', 'Futbol', 'PROMOCIÓN DEPORTIVA — VESPERTINO', 'Campo Miguel Arroyo', 'José Luis Everardo Hernández', 30),
  ('44444444-4444-4444-4444-444444444442', 'Basquetbol Vesp.', 'PROMOCIÓN DEPORTIVA — VESPERTINO', 'Gimnasio 1', 'Juan Carlos Santiago Loaiza', 30);

INSERT INTO public.horarios (taller_id, dia, hora_inicio, hora_fin) VALUES
  ('11111111-1111-1111-1111-111111111111', 'sábado', '09:00', '12:00'),
  ('11111111-1111-1111-1111-111111111112', 'martes', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111112', 'miércoles', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111112', 'jueves', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111113', 'lunes', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111113', 'miércoles', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111114', 'martes', '15:00', '15:30'),
  ('11111111-1111-1111-1111-111111111114', 'jueves', '15:00', '15:30'),
  ('11111111-1111-1111-1111-111111111115', 'martes', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111115', 'jueves', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111116', 'lunes', '15:00', '16:00'),
  ('11111111-1111-1111-1111-111111111116', 'miércoles', '15:00', '16:00'),
  ('11111111-1111-1111-1111-111111111117', 'martes', '15:00', '16:00'),
  ('11111111-1111-1111-1111-111111111117', 'jueves', '15:00', '16:00'),
  ('11111111-1111-1111-1111-111111111118', 'lunes', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111118', 'miércoles', '15:30', '16:30'),
  ('11111111-1111-1111-1111-111111111119', 'martes', '15:00', '16:00'),
  ('11111111-1111-1111-1111-111111111119', 'jueves', '15:00', '16:00'),
  ('22222222-2222-2222-2222-222222222221', 'lunes', '15:30', '16:30'),
  ('22222222-2222-2222-2222-222222222221', 'miércoles', '15:30', '16:30'),
  ('22222222-2222-2222-2222-222222222221', 'viernes', '15:30', '16:30'),
  ('22222222-2222-2222-2222-222222222222', 'martes', '15:30', '16:30'),
  ('22222222-2222-2222-2222-222222222222', 'jueves', '15:30', '16:30'),
  ('22222222-2222-2222-2222-222222222223', 'lunes', '15:00', '16:00'),
  ('22222222-2222-2222-2222-222222222223', 'miércoles', '15:00', '16:00'),
  ('33333333-3333-3333-3333-333333333331', 'martes', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333331', 'jueves', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333332', 'lunes', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333332', 'miércoles', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333333', 'martes', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333333', 'jueves', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333334', 'lunes', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333334', 'miércoles', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333335', 'martes', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333335', 'jueves', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333336', 'lunes', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333336', 'miércoles', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333337', 'martes', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333337', 'jueves', '15:30', '16:30'),
  ('33333333-3333-3333-3333-333333333338', 'martes', '15:00', '16:00'),
  ('33333333-3333-3333-3333-333333333338', 'jueves', '15:00', '16:00'),
  ('44444444-4444-4444-4444-444444444441', 'miércoles', '10:00', '11:00'),
  ('44444444-4444-4444-4444-444444444441', 'jueves', '10:00', '11:00'),
  ('44444444-4444-4444-4444-444444444442', 'miércoles', '10:00', '11:00'),
  ('44444444-4444-4444-4444-444444444442', 'jueves', '10:00', '11:00');
