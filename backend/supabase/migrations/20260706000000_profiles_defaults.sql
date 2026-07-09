-- Migration: Set default values for profiles.cambios_restantes and inscripcion_limite
-- Removes the race condition where the frontend initializes these values asynchronously

BEGIN;

ALTER TABLE profiles
  ALTER COLUMN cambios_restantes SET DEFAULT 3,
  ALTER COLUMN inscripcion_limite SET DEFAULT (now() + INTERVAL '21 days');

UPDATE profiles
SET
  cambios_restantes = COALESCE(cambios_restantes, 3),
  inscripcion_limite = COALESCE(inscripcion_limite, now() + INTERVAL '21 days');

COMMIT;
