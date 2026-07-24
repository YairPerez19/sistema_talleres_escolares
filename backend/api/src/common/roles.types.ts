// Roles disponibles en la plataforma. Sincronizado con el enum `app_role` de Supabase.
export type AppRole = 'admin' | 'instructor' | 'student';

export const ROLES: readonly AppRole[] = [
  'admin',
  'instructor',
  'student',
] as const;
