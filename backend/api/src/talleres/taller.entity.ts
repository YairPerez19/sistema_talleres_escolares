// Tipos que reflejan la tabla `talleres` y `horarios` de Supabase.
// Mantener sincronizado con setup_database.sql.

export type CategoriaTaller =
  | 'DIFUSIÓN CULTURAL'
  | 'ACTIVIDADES CÍVICAS'
  | 'PROMOCIÓN DEPORTIVA — MATUTINO'
  | 'PROMOCIÓN DEPORTIVA — VESPERTINO';

export const CATEGORIAS_TALLER: readonly CategoriaTaller[] = [
  'DIFUSIÓN CULTURAL',
  'ACTIVIDADES CÍVICAS',
  'PROMOCIÓN DEPORTIVA — MATUTINO',
  'PROMOCIÓN DEPORTIVA — VESPERTINO',
] as const;

export const DIAS_SEMANA = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
] as const;

export type DiaSemana = (typeof DIAS_SEMANA)[number];

export interface Horario {
  id: string;
  taller_id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface Taller {
  id: string;
  nombre: string;
  categoria: string;
  lugar: string;
  instructor: string;
  instructor_id: string | null;
  descripcion: string | null;
  cupo: number;
  imagen_url: string | null;
}

export interface TallerConHorarios extends Taller {
  horarios: Horario[];
}

export interface TallerConCupo extends TallerConHorarios {
  inscritos: number;
  disponible: boolean;
}
