const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://taarmixrsznxeltawztq.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhYXJtaXhyc3pueGVsdGF3enRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQxNzU4NywiZXhwIjoyMDkyOTkzNTg3fQ.kivUxYiMeEv4p_JhxnpMHflvs5iRHulZW-blSwWE8OA';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  // Try to create the table by checking if it exists first
  const { data: tables, error: tablesError } = await supabase
    .from('verification_codes')
    .select('id')
    .limit(1);

  if (tablesError && tablesError.code === '42P01') {
    console.log('Tabla verification_codes no existe. Intentando crearla...');
  } else if (!tablesError) {
    console.log('La tabla verification_codes ya existe.');
    return;
  } else {
    console.log('Error al verificar:', tablesError.message);
  }

  // Try direct Postgres connection via pg (needs DB password)
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
      CREATE TABLE IF NOT EXISTS public.verification_codes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        code_hash text NOT NULL,
        email text NOT NULL,
        expires_at timestamptz NOT NULL,
        attempts int DEFAULT 0,
        used boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      );

      ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "service_role_access" ON public.verification_codes;
      CREATE POLICY "service_role_access"
        ON public.verification_codes
        FOR ALL
        USING (true)
        WITH CHECK (true);
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
    console.log('   backend/supabase/migrations/20260616000000_verification_codes.sql');
    console.log('');
    console.log('O bien, proporciona la contraseña de la base de datos:');
    console.log('   Supabase Dashboard → Project Settings → Database → Password');
  }
}

run();
