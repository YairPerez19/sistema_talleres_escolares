export type Taller = {
  id: string;
  nombre: string;
  categoria: string;
  lugar: string;
  instructor: string;
  instructor_id?: string | null;
  descripcion: string | null;
  cupo: number;
  imagen_url: string | null;
};

export type Horario = {
  id: string;
  taller_id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
};

export type Dia = 'lunes' | 'martes' | 'miércoles' | 'jueves' | 'viernes' | 'sábado';

export const CATEGORIA_LABEL: Record<string, string> = {
  'DIFUSIÓN CULTURAL': 'Cultural',
  'ACTIVIDADES CÍVICAS': 'Cívica',
  'PROMOCIÓN DEPORTIVA — MATUTINO': 'Deportiva (Mat)',
  'PROMOCIÓN DEPORTIVA — VESPERTINO': 'Deportiva (Vesp)'
};

export const DIA_LABEL: Record<string, string> = {
  'lunes': 'Lun',
  'martes': 'Mar',
  'miércoles': 'Mié',
  'jueves': 'Jue',
  'viernes': 'Vie',
  'sábado': 'Sáb'
};

export function fmtHora(time: string): string {
  // Ej: "15:30:00" -> "15:30"
  return time.slice(0, 5);
}

// Check time overlaps
function timesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB;
}

export function colisiona(a: Horario, b: Horario): boolean {
  if (a.dia.toLowerCase() !== b.dia.toLowerCase()) return false;
  return timesOverlap(a.hora_inicio, a.hora_fin, b.hora_inicio, b.hora_fin);
}

export function tieneColision(targetHorarios: Horario[], inscritosHorarios: Horario[]): Horario | null {
  for (const th of targetHorarios) {
    for (const ih of inscritosHorarios) {
      if (colisiona(th, ih)) {
        return ih; // Devuelve el horario que causa conflicto
      }
    }
  }
  return null;
}
