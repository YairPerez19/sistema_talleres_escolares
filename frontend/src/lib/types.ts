// ============================================================
// Tipos compartidos para el módulo de asistencia
// ============================================================

import { Check, X, Clock, FileText, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Taller, Horario } from './talleres';

export type { Horario };

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

export interface TallerConInstructor extends Taller {
  instructor_id: string | null;
  horarios?: Horario[];
  alumnos_count?: number;
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
    emoji: '',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
  },
  ausente: {
    label: 'Ausente',
    emoji: '',
    color: 'text-[#f4d78e]',
    bg: 'bg-[#8B1A32]/25',
    border: 'border-[#8B1A32]/40',
  },
  retardo: {
    label: 'Retardo',
    emoji: '',
    color: 'text-[#f4d78e]',
    bg: 'bg-[#8B1A32]/15',
    border: 'border-[#f4d78e]/30',
  },
  justificado: {
    label: 'Justificado',
    emoji: '',
    color: 'text-white/70',
    bg: 'bg-white/10',
    border: 'border-white/20',
  },
  sin_registro: {
    label: 'Sin registro',
    emoji: '',
    color: 'text-white/30',
    bg: 'bg-white/5',
    border: 'border-white/10',
  },
};

/**
 * Iconos Lucide asociados a cada estado de asistencia.
 * Usados en EstadoBadge y en los botones rápidos de AlumnoRow.
 */
export const ESTADO_ICON: Record<EstadoAsistencia, LucideIcon> = {
  presente:    Check,
  ausente:     X,
  retardo:     Clock,
  justificado: FileText,
  sin_registro: Minus,
};
