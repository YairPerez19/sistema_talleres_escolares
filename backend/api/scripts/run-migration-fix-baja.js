const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://taarmixrsznxeltawztq.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYXJtaXhyc3pueGVsdGF3enRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQxNzU4NywiZXhwIjoyMDkyOTkzNTg3fQ.kivUxYiMeEv4p_JhxnpMHflvs5iRHulZW-blSwWE8OA';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  console.log('Verificando columna cambios_restantes en profiles...');

  const { error: checkError } = await supabase
    .from('profiles')
    .select('cambios_restantes')
    .limit(1);

  if (checkError && checkError.code === '42703') {
    console.log('Columna cambios_restantes NO existe. Ejecutando migración...');
  } else if (!checkError) {
    console.log('Columna cambios_restantes ya existe. No se necesita migración.');
    return;
  } else {
    console.log('Error al verificar:', checkError.message);
    console.log('Intentando ejecutar la migración de todas formas...');
  }

  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: `db.${SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')}.supabase.co`,
      database: 'postgres',
      user: 'postgres',
      password: process.env.SUPABASE_DB_PASSWORD || '',
      port: 5432,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000,
    });

    const client = await pool.connect();
    console.log('Conectado a PostgreSQL');

    const sql = `
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS cambios_restantes int DEFAULT 3;

      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS inscripcion_limite timestamptz DEFAULT (now() + interval '3 weeks');

      UPDATE public.profiles 
      SET 
        cambios_restantes = COALESCE(cambios_restantes, 3),
        inscripcion_limite = COALESCE(inscripcion_limite, now() + interval '3 weeks')
      WHERE cambios_restantes IS NULL OR inscripcion_limite IS NULL;

      CREATE OR REPLACE FUNCTION public.dar_baja_taller(p_alumno_id uuid, p_taller_id uuid)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        v_cambios_nuevos int;
        v_taller_nombre text;
        v_inscripcion_exists boolean;
      BEGIN
        SELECT EXISTS(
          SELECT 1 FROM public.inscripciones 
          WHERE alumno_id = p_alumno_id AND taller_id = p_taller_id
        ) INTO v_inscripcion_exists;

        IF NOT v_inscripcion_exists THEN
          RETURN jsonb_build_object('success', false, 'error', 'No se encontro la inscripcion');
        END IF;

        SELECT nombre INTO v_taller_nombre 
        FROM public.talleres 
        WHERE id = p_taller_id;

        DELETE FROM public.inscripciones
        WHERE alumno_id = p_alumno_id AND taller_id = p_taller_id;

        SELECT COALESCE(cambios_restantes, 3) INTO v_cambios_nuevos
        FROM public.profiles
        WHERE id = p_alumno_id;

        RETURN jsonb_build_object(
          'success', true,
          'cambios_restantes', v_cambios_nuevos,
          'taller_nombre', v_taller_nombre
        );
      END;
      $$;

      CREATE OR REPLACE FUNCTION public.handle_inscripcion_change()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        IF (TG_OP = 'DELETE') THEN
          UPDATE public.profiles
          SET cambios_restantes = GREATEST(COALESCE(cambios_restantes, 3) - 1, 0)
          WHERE id = OLD.alumno_id;
        END IF;
        RETURN NULL;
      END;
      $$;

      DROP TRIGGER IF EXISTS on_inscripcion_deleted ON public.inscripciones;
      CREATE TRIGGER on_inscripcion_deleted
        AFTER DELETE ON public.inscripciones
        FOR EACH ROW EXECUTE PROCEDURE public.handle_inscripcion_change();
    `;

    await client.query(sql);
    console.log('Migración ejecutada exitosamente.');
    await client.end();
    await pool.end();
  } catch (err) {
    console.log('No se pudo conectar a PostgreSQL directamente.');
    console.log('Error:', err.message);
    console.log('');
    console.log('========================================');
    console.log('Para ejecutar la migración manualmente:');
    console.log('========================================');
    console.log('1. Abre: https://supabase.com/dashboard/project/taarmixrsznxeltawztq/sql/new');
    console.log('2. Pega y ejecuta el SQL del archivo:');
    console.log('   backend/supabase/migrations/20260730000001_fix_cambios_restantes.sql');
    console.log('');
    console.log('O bien, proporciona la contraseña de la base de datos:');
    console.log('   SUPABASE_DB_PASSWORD=node run-migration-fix-baja.js');
  }
}

run();
