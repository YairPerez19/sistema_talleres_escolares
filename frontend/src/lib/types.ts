// ============================================================
// Tipos compartidos para el módulo de asistencia
// ============================================================

export type AppRole = 'admin' | 'instructor' | 'student';

export type EstadoAsistencia = 'presente' | 'ausente' | 'retardo' | 'justificado' | 'sin_registro';

export interface Asistencia {
  id: string;
  alumno_id: string;
  taller_id: string;
  instructor_id: string | null;
  fecha: string;
  hora: string | null;
  estado: EstadoAsistencia;
  observaciones: string | null;
  created_at: string | null;
}

export interface AlumnoConAsistencia {
  alumno_id: string;
  nombre: string;
  matricula: string;
  turno: string;
  estado: EstadoAsistencia;
  observaciones: string | null;
  hora: string | null;
  asistencia_id: string | null;
}

export interface TallerConInstructor {
  id: string;
  nombre: string;
  categoria: string;
  lugar: string;
  instructor: string;
  instructor_id: string | null;
  descripcion: string | null;
  cupo: number | null;
  imagen_url: string | null;
  horarios?: Horario[];
  alumnos_count?: number;
}

export interface Horario {
  id: string;
  taller_id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface EstadisticasAsistencia {
  alumno_id: string;
  sesiones_asistidas: number;
  faltas_injustificadas: number;
  faltas_justificadas: number;
  retardos: number;
  total_sesiones: number;
  porcentaje_asistencia: number;
  deuda_total: number;
}

export interface FiltroAsistencia {
  fecha?: string;
  taller_id?: string;
  instructor_id?: string;
  alumno_id?: string;
  estado?: EstadoAsistencia | '';
}

export const ESTADO_CONFIG: Record<EstadoAsistencia, {
  label: string;
  emoji: string;
  color: string;
  bg: string;
  border: string;
}> = {
  presente: {
    label: 'Presente',
    emoji: '✅',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
  },
  ausente: {
    label: 'Ausente',
    emoji: '❌',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    border: 'border-red-500/30',
  },
  retardo: {
    label: 'Retardo',
    emoji: '⏰',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
  },
  justificado: {
    label: 'Justificado',
    emoji: '📄',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
  },
  sin_registro: {
    label: 'Sin registro',
    emoji: '—',
    color: 'text-white/30',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
};
