export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nombre: string
          matricula: string
          turno: string
          cambios_restantes: number | null
          inscripcion_limite: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          nombre: string
          matricula: string
          turno: string
          cambios_restantes?: number | null
          inscripcion_limite?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          matricula?: string
          turno?: string
          cambios_restantes?: number | null
          inscripcion_limite?: string | null
          created_at?: string | null
        }
      }
      talleres: {
        Row: {
          id: string
          nombre: string
          categoria: string
          lugar: string
          instructor: string
          instructor_id: string | null
          descripcion: string | null
          cupo: number | null
          imagen_url: string | null
        }
        Insert: {
          id?: string
          nombre: string
          categoria: string
          lugar: string
          instructor: string
          instructor_id?: string | null
          descripcion?: string | null
          cupo?: number | null
          imagen_url?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          categoria?: string
          lugar?: string
          instructor?: string
          instructor_id?: string | null
          descripcion?: string | null
          cupo?: number | null
          imagen_url?: string | null
        }
      }
      horarios: {
        Row: {
          id: string
          taller_id: string
          dia: string
          hora_inicio: string
          hora_fin: string
        }
        Insert: {
          id?: string
          taller_id: string
          dia: string
          hora_inicio: string
          hora_fin: string
        }
        Update: {
          id?: string
          taller_id?: string
          dia?: string
          hora_inicio?: string
          hora_fin?: string
        }
      }
      inscripciones: {
        Row: {
          id: string
          alumno_id: string
          taller_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          alumno_id: string
          taller_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          alumno_id?: string
          taller_id?: string
          created_at?: string | null
        }
      }
      asistencias: {
        Row: {
          id: string
          alumno_id: string
          taller_id: string
          instructor_id: string | null
          fecha: string
          hora: string | null
          estado: string
          observaciones: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          alumno_id: string
          taller_id: string
          instructor_id?: string | null
          fecha: string
          hora?: string | null
          estado: string
          observaciones?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          alumno_id?: string
          taller_id?: string
          instructor_id?: string | null
          fecha?: string
          hora?: string | null
          estado?: string
          observaciones?: string | null
          created_at?: string | null
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role: string
        }
        Insert: {
          user_id: string
          role: string
        }
        Update: {
          user_id?: string
          role?: string
        }
      }
      instructores: {
        Row: {
          id: string
          user_id: string
          especialidad: string | null
          telefono: string | null
          activo: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          especialidad?: string | null
          telefono?: string | null
          activo?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          especialidad?: string | null
          telefono?: string | null
          activo?: boolean | null
          created_at?: string | null
        }
      }
      sesiones: {
        Row: {
          id: string
          taller_id: string
          fecha: string
          creado_en: string | null
        }
        Insert: {
          id?: string
          taller_id: string
          fecha?: string
          creado_en?: string | null
        }
        Update: {
          id?: string
          taller_id?: string
          fecha?: string
          creado_en?: string | null
        }
      }
    }
    Views: {
      deuda_alumnos: {
        Row: {
          alumno_id: string | null
          sesiones_asistidas: number | null
          faltas_injustificadas: number | null
          faltas_justificadas: number | null
          retardos: number | null
          total_sesiones: number | null
          porcentaje_asistencia: number | null
          deuda_total: number | null
        }
      }
      estadisticas_talleres: {
        Row: {
          taller_id: string | null
          taller_nombre: string | null
          categoria: string | null
          instructor: string | null
          alumnos_registrados: number | null
          asistencias_totales: number | null
          faltas_totales: number | null
          sesiones_tomadas: number | null
          porcentaje_asistencia_global: number | null
        }
      }
    }
    Functions: {
      get_asistencia_taller: {
        Args: {
          p_taller_id: string
          p_fecha: string
        }
        Returns: {
          alumno_id: string
          nombre: string
          matricula: string
          turno: string
          estado: string
          observaciones: string | null
          hora: string | null
          asistencia_id: string | null
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: string
        }
        Returns: boolean
      }
      check_inscripcion_colision: {
        Args: {
          p_alumno_id: string
          p_taller_id: string
        }
        Returns: boolean
      }
      dar_baja_taller: {
        Args: {
          p_alumno_id: string
          p_taller_id: string
        }
        Returns: {
          success: boolean
          cambios_restantes: number
          taller_nombre: string
          error?: string
        }
      }
    }
  }
}
