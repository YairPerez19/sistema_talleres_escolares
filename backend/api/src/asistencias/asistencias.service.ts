import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '../common/roles.guard';
import type {
  RecordAsistenciaDto,
  EstadoAsistencia,
} from './dto/record-asistencia.dto';
import type { BulkAsistenciaDto } from './dto/bulk-asistencia.dto';
import type { FilterAsistenciaDto } from './dto/filter-asistencia.dto';

export interface AsistenciaRecord {
  id: string;
  alumno_id: string;
  taller_id: string;
  instructor_id: string | null;
  fecha: string;
  hora: string | null;
  estado: EstadoAsistencia;
  observaciones: string | null;
  created_at: string;
}

export interface BulkAsistenciaResponse {
  updated_count: number;
}

export interface AlumnoAsistenciaRosterItem {
  alumno_id: string;
  nombre: string;
  matricula: string;
  turno: string;
  estado: EstadoAsistencia | 'sin_registro';
  observaciones: string | null;
  hora: string | null;
  asistencia_id: string | null;
}

export interface AsistenciaAdminItem {
  id: string;
  alumno_id: string;
  taller_id: string;
  instructor_id: string | null;
  fecha: string;
  hora: string | null;
  estado: EstadoAsistencia;
  observaciones: string | null;
  created_at: string;
  profiles: {
    id: string;
    nombre: string;
    matricula: string;
    turno?: string;
  } | null;
  talleres: {
    id: string;
    nombre: string;
    categoria: string;
    instructor?: string;
  } | null;
}

export interface PaginatedAsistenciasAdmin {
  data: AsistenciaAdminItem[];
  total: number;
  page: number;
  limit: number;
}

export interface MiAsistenciaItem {
  id: string;
  taller_id: string;
  taller_nombre: string;
  categoria: string;
  instructor: string;
  fecha: string;
  hora: string | null;
  estado: EstadoAsistencia;
  observaciones: string | null;
  created_at: string;
}

interface TallerRow {
  id: string;
  nombre: string;
  instructor_id: string | null;
}

@Injectable()
export class AsistenciasService {
  private readonly logger = new Logger(AsistenciasService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient<any>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getCurrentTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  async recordAsistencia(
    user: AuthUser,
    dto: RecordAsistenciaDto,
  ): Promise<AsistenciaRecord> {
    // 1. Validar existencia del taller y asignación si el usuario es instructor
    const { data: taller, error: tallerError } = (await this.supabase
      .from('talleres')
      .select('id, nombre, instructor_id')
      .eq('id', dto.taller_id)
      .maybeSingle()) as {
      data: TallerRow | null;
      error: { message?: string } | null;
    };

    if (tallerError) this.fail('consultar taller', tallerError);
    if (!taller) {
      throw new NotFoundException(
        `Taller con ID "${dto.taller_id}" no encontrado.`,
      );
    }

    if (user.role === 'instructor' && taller.instructor_id !== user.id) {
      throw new ForbiddenException(
        'No estás asignado como instructor de este taller.',
      );
    }

    // 2. Validar fecha actual para rol instructor (admins pueden registrar cualquier fecha)
    if (user.role === 'instructor' && dto.fecha !== this.getTodayString()) {
      throw new ForbiddenException(
        'Solo puedes registrar o editar asistencia para la fecha actual.',
      );
    }

    // 3. Validar que el alumno esté actualmente inscrito en el taller
    const { data: inscripcion, error: insError } = (await this.supabase
      .from('inscripciones')
      .select('id')
      .eq('alumno_id', dto.alumno_id)
      .eq('taller_id', dto.taller_id)
      .maybeSingle()) as {
      data: { id: string } | null;
      error: { message?: string } | null;
    };

    if (insError) this.fail('verificar inscripción del alumno', insError);
    if (!inscripcion) {
      throw new BadRequestException(
        'El alumno no está inscrito en este taller.',
      );
    }

    // 4. Upsert en public.asistencias sobre conflicto (alumno_id, taller_id, fecha)
    const hora = this.getCurrentTimeString();
    const { data: savedRecord, error: upsertError } = (await this.supabase
      .from('asistencias')
      .upsert(
        {
          alumno_id: dto.alumno_id,
          taller_id: dto.taller_id,
          instructor_id: user.id,
          fecha: dto.fecha,
          hora,
          estado: dto.estado,
          observaciones: dto.observaciones ?? null,
        },
        { onConflict: 'alumno_id,taller_id,fecha' },
      )
      .select(
        'id, alumno_id, taller_id, instructor_id, fecha, hora, estado, observaciones, created_at',
      )
      .single()) as {
      data: AsistenciaRecord | null;
      error: { message?: string } | null;
    };

    if (upsertError) this.fail('registrar asistencia', upsertError);

    return savedRecord!;
  }

  async recordBulkAsistencia(
    user: AuthUser,
    dto: BulkAsistenciaDto,
  ): Promise<BulkAsistenciaResponse> {
    // 1. Validar existencia del taller
    const { data: taller, error: tallerError } = (await this.supabase
      .from('talleres')
      .select('id, nombre, instructor_id')
      .eq('id', dto.taller_id)
      .maybeSingle()) as {
      data: TallerRow | null;
      error: { message?: string } | null;
    };

    if (tallerError) this.fail('consultar taller', tallerError);
    if (!taller) {
      throw new NotFoundException(
        `Taller con ID "${dto.taller_id}" no encontrado.`,
      );
    }

    // 2. Restricciones para instructor: debe estar asignado y fecha actual
    if (user.role === 'instructor' && taller.instructor_id !== user.id) {
      throw new ForbiddenException(
        'No estás asignado como instructor de este taller.',
      );
    }

    if (user.role === 'instructor' && dto.fecha !== this.getTodayString()) {
      throw new ForbiddenException(
        'Solo puedes registrar o editar asistencia para la fecha actual.',
      );
    }

    // 3. Obtener alumnos inscritos en el taller
    const { data: enrolled, error: enrollError } = (await this.supabase
      .from('inscripciones')
      .select('alumno_id')
      .eq('taller_id', dto.taller_id)) as {
      data: { alumno_id: string }[] | null;
      error: { message?: string } | null;
    };

    if (enrollError) this.fail('consultar alumnos inscritos', enrollError);
    const enrolledList = enrolled ?? [];
    const enrolledIds = new Set(enrolledList.map((e) => e.alumno_id));

    let targetAlumnoIds: string[] = [];

    if (dto.alumno_ids && dto.alumno_ids.length > 0) {
      // Filtrar solo los alumnos especificados que efectivamente estén inscritos
      targetAlumnoIds = dto.alumno_ids.filter((id) => enrolledIds.has(id));
    } else {
      // Si no se proporcionaron alumno_ids, tomar todos los inscritos que aún no tengan registro para esa fecha
      const { data: existing, error: asisError } = (await this.supabase
        .from('asistencias')
        .select('alumno_id')
        .eq('taller_id', dto.taller_id)
        .eq('fecha', dto.fecha)) as {
        data: { alumno_id: string }[] | null;
        error: { message?: string } | null;
      };

      if (asisError) this.fail('consultar asistencias existentes', asisError);
      const existingSet = new Set((existing ?? []).map((a) => a.alumno_id));
      targetAlumnoIds = enrolledList
        .map((e) => e.alumno_id)
        .filter((id) => !existingSet.has(id));
    }

    if (targetAlumnoIds.length === 0) {
      return { updated_count: 0 };
    }

    const hora = this.getCurrentTimeString();
    const records = targetAlumnoIds.map((alumnoId) => ({
      alumno_id: alumnoId,
      taller_id: dto.taller_id,
      instructor_id: user.id,
      fecha: dto.fecha,
      hora,
      estado: dto.estado,
      observaciones: null,
    }));

    const { error: upsertError } = (await this.supabase
      .from('asistencias')
      .upsert(records, { onConflict: 'alumno_id,taller_id,fecha' })) as {
      error: { message?: string } | null;
    };

    if (upsertError) this.fail('registrar asistencia masiva', upsertError);

    return { updated_count: records.length };
  }

  async getRosterByTaller(
    user: AuthUser,
    tallerId: string,
    fecha?: string,
  ): Promise<AlumnoAsistenciaRosterItem[]> {
    // 1. Validar taller
    const { data: taller, error: tallerError } = (await this.supabase
      .from('talleres')
      .select('id, nombre, instructor_id')
      .eq('id', tallerId)
      .maybeSingle()) as {
      data: TallerRow | null;
      error: { message?: string } | null;
    };

    if (tallerError) this.fail('consultar taller', tallerError);
    if (!taller) {
      throw new NotFoundException(`Taller con ID "${tallerId}" no encontrado.`);
    }

    // 2. Instructor check
    if (user.role === 'instructor' && taller.instructor_id !== user.id) {
      throw new ForbiddenException(
        'No estás asignado como instructor de este taller.',
      );
    }

    const targetFecha = fecha ?? this.getTodayString();

    // 3. Consultar alumnos inscritos con perfil
    const { data: inscripciones, error: insError } = (await this.supabase
      .from('inscripciones')
      .select('alumno_id, profiles(id, nombre, matricula, turno)')
      .eq('taller_id', tallerId)) as {
      data:
        | {
            alumno_id: string;
            profiles: {
              id: string;
              nombre: string;
              matricula: string;
              turno?: string;
            } | null;
          }[]
        | null;
      error: { message?: string } | null;
    };

    if (insError) this.fail('consultar inscritos del taller', insError);

    // 4. Consultar asistencias para la fecha indicada
    const { data: asistencias, error: asisError } = (await this.supabase
      .from('asistencias')
      .select('id, alumno_id, estado, observaciones, hora')
      .eq('taller_id', tallerId)
      .eq('fecha', targetFecha)) as {
      data:
        | {
            id: string;
            alumno_id: string;
            estado: EstadoAsistencia;
            observaciones: string | null;
            hora: string | null;
          }[]
        | null;
      error: { message?: string } | null;
    };

    if (asisError) this.fail('consultar asistencias del taller', asisError);

    const asisMap = new Map((asistencias ?? []).map((a) => [a.alumno_id, a]));

    const roster: AlumnoAsistenciaRosterItem[] = (inscripciones ?? []).map(
      (ins) => {
        const asis = asisMap.get(ins.alumno_id);
        return {
          alumno_id: ins.alumno_id,
          nombre: ins.profiles?.nombre ?? '',
          matricula: ins.profiles?.matricula ?? '',
          turno: ins.profiles?.turno ?? '',
          estado: asis ? asis.estado : 'sin_registro',
          observaciones: asis?.observaciones ?? null,
          hora: asis?.hora ?? null,
          asistencia_id: asis?.id ?? null,
        };
      },
    );

    roster.sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
    );

    return roster;
  }

  async findAllAdmin(
    filter: FilterAsistenciaDto,
  ): Promise<PaginatedAsistenciasAdmin> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    let query = this.supabase.from('asistencias').select(
      `
        id,
        alumno_id,
        taller_id,
        instructor_id,
        fecha,
        hora,
        estado,
        observaciones,
        created_at,
        profiles(id, nombre, matricula, turno),
        talleres(id, nombre, categoria, instructor)
      `,
      { count: 'exact' },
    );

    if (filter.fecha) {
      query = query.eq('fecha', filter.fecha);
    }
    if (filter.taller_id) {
      query = query.eq('taller_id', filter.taller_id);
    }
    if (filter.estado) {
      query = query.eq('estado', filter.estado);
    }
    if (filter.alumno_id) {
      query = query.eq('alumno_id', filter.alumno_id);
    }

    query = query
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = (await query) as {
      data: AsistenciaAdminItem[] | null;
      count: number | null;
      error: { message?: string } | null;
    };

    if (error) this.fail('listar asistencias', error);

    return {
      data: data ?? [],
      total: count ?? (data ? data.length : 0),
      page,
      limit,
    };
  }

  async getMisAsistencias(userId: string): Promise<MiAsistenciaItem[]> {
    const { data, error } = (await this.supabase
      .from('asistencias')
      .select(
        'id, taller_id, fecha, hora, estado, observaciones, created_at, talleres(id, nombre, categoria, instructor)',
      )
      .eq('alumno_id', userId)
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false })) as {
      data:
        | {
            id: string;
            taller_id: string;
            fecha: string;
            hora: string | null;
            estado: EstadoAsistencia;
            observaciones: string | null;
            created_at: string;
            talleres: {
              id: string;
              nombre: string;
              categoria: string;
              instructor?: string;
            } | null;
          }[]
        | null;
      error: { message?: string } | null;
    };

    if (error) this.fail('consultar mis asistencias', error);

    return (data ?? []).map((row) => ({
      id: row.id,
      taller_id: row.taller_id,
      taller_nombre: row.talleres?.nombre ?? '',
      categoria: row.talleres?.categoria ?? '',
      instructor: row.talleres?.instructor ?? '',
      fecha: row.fecha,
      hora: row.hora,
      estado: row.estado,
      observaciones: row.observaciones,
      created_at: row.created_at,
    }));
  }

  private fail(op: string, error: { message?: string }): never {
    this.logger.error(`Error al ${op}: ${error?.message ?? 'desconocido'}`);
    throw new InternalServerErrorException(`No se pudo ${op}.`);
  }
}
