import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AuthUser } from '../common/roles.guard';
import type { CreateInscripcionDto } from './dto/create-inscripcion.dto';
import type { BajaInscripcionDto } from './dto/baja-inscripcion.dto';
import type { FilterInscripcionDto } from './dto/filter-inscripcion.dto';

export interface InscripcionCreatedResponse {
  id: string;
  alumno_id: string;
  taller_id: string;
  taller_nombre: string;
  created_at: string;
}

export interface BajaResponse {
  success: boolean;
  cambios_restantes: number;
  taller_nombre: string;
}

export interface HorarioItem {
  id: string;
  taller_id: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface MiTallerInscrito {
  id: string;
  taller_id: string;
  taller_nombre: string;
  categoria: string;
  lugar: string;
  instructor: string;
  instructor_id: string | null;
  cupo: number;
  horarios: HorarioItem[];
  created_at: string;
}

export interface AlumnoInscritoRosterItem {
  inscripcion_id: string;
  alumno_id: string;
  nombre: string;
  matricula: string;
  turno: string;
  created_at: string;
}

export interface TallerRosterResponse {
  taller_id: string;
  taller_nombre: string;
  cupo: number;
  total: number;
  inscritos: AlumnoInscritoRosterItem[];
}

export interface InscripcionAdminItem {
  id: string;
  alumno_id: string;
  alumno_nombre: string;
  alumno_matricula: string;
  taller_id: string;
  taller_nombre: string;
  categoria: string;
  created_at: string;
}

export interface PaginatedInscripcionesAdmin {
  data: InscripcionAdminItem[];
  total: number;
  page: number;
  limit: number;
}

interface ProfileRow {
  id: string;
  nombre: string;
  matricula: string;
  turno?: string;
  inscripcion_limite: string | null;
  cambios_restantes: number | null;
}

interface DeudaRow {
  alumno_id: string;
  deuda_total: number | null;
}

interface TallerRow {
  id: string;
  nombre: string;
  categoria: string;
  lugar?: string;
  instructor?: string;
  instructor_id?: string | null;
  cupo: number;
  horarios?: HorarioItem[];
}

interface InscripcionJoinedRow {
  id: string;
  alumno_id: string;
  taller_id: string;
  created_at: string;
  profiles?: {
    id: string;
    nombre: string;
    matricula: string;
    turno?: string;
  } | null;
  talleres?: {
    id: string;
    nombre: string;
    categoria: string;
    lugar?: string;
    instructor?: string;
    instructor_id?: string | null;
    cupo?: number;
    horarios?: HorarioItem[];
  } | null;
}

@Injectable()
export class InscripcionesService {
  private readonly logger = new Logger(InscripcionesService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient<any>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  timesOverlap(
    startA: string,
    endA: string,
    startB: string,
    endB: string,
  ): boolean {
    const parseMinutes = (t: string): number => {
      const [h = '0', m = '0'] = t.split(':');
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    };
    const sA = parseMinutes(startA);
    const eA = parseMinutes(endA);
    const sB = parseMinutes(startB);
    const eB = parseMinutes(endB);
    return sA < eB && eA > sB;
  }

  async create(
    user: AuthUser,
    dto: CreateInscripcionDto,
  ): Promise<InscripcionCreatedResponse> {
    // 1. Identificar target alumno_id
    let alumnoId = user.id;
    if (user.role === 'admin' && dto.alumno_id) {
      alumnoId = dto.alumno_id;
    }

    // 2. Adeudos check: consultar deuda_alumnos para el alumno_id
    // Si el usuario es admin, se permite bypass
    if (user.role !== 'admin') {
      const { data: debtData, error: debtError } = (await this.supabase
        .from('deuda_alumnos')
        .select('deuda_total')
        .eq('alumno_id', alumnoId)
        .maybeSingle()) as {
        data: DeudaRow | null;
        error: { message?: string } | null;
      };

      if (debtError) {
        this.logger.warn(
          `Error al consultar deudas de alumno ${alumnoId}: ${debtError.message ?? 'desconocido'}`,
        );
      } else if (debtData && Number(debtData.deuda_total ?? 0) > 0) {
        const total = Number(debtData.deuda_total);
        throw new BadRequestException(
          `Inscripción bloqueada: el alumno presenta un adeudo pendiente de $${total} MXN. Acude a coordinación para liquidar.`,
        );
      }
    }

    // 3. Periodo de inscripciones (ventana temporal) y 4. Límite de cambios
    const { data: profile, error: profileError } = (await this.supabase
      .from('profiles')
      .select('id, nombre, matricula, inscripcion_limite, cambios_restantes')
      .eq('id', alumnoId)
      .maybeSingle()) as {
      data: ProfileRow | null;
      error: { message?: string } | null;
    };

    if (profileError) this.fail('consultar perfil de alumno', profileError);
    if (!profile) {
      throw new NotFoundException(
        `Perfil del alumno con ID "${alumnoId}" no encontrado.`,
      );
    }

    // Paso 3: Ventana temporal
    if (profile.inscripcion_limite) {
      const limite = new Date(profile.inscripcion_limite);
      if (Date.now() > limite.getTime()) {
        throw new BadRequestException(
          'El periodo de inscripciones ha finalizado.',
        );
      }
    }

    // Paso 4: Límite de cambios
    const cambios = profile.cambios_restantes ?? 3;
    if (cambios <= 0) {
      throw new BadRequestException(
        'Has agotado tus 3 oportunidades de cambio de taller.',
      );
    }

    // 5. Duplicidad: verificar si ya está inscrito en este taller
    const { data: existingInscripcion, error: existError } =
      (await this.supabase
        .from('inscripciones')
        .select('id')
        .eq('alumno_id', alumnoId)
        .eq('taller_id', dto.taller_id)
        .maybeSingle()) as {
        data: { id: string } | null;
        error: { message?: string } | null;
      };

    if (existError)
      this.fail('verificar duplicidad de inscripción', existError);
    if (existingInscripcion) {
      throw new ConflictException('Ya estás inscrito en este taller.');
    }

    // 6. Cupo disponible: verificar cupo del taller
    const { data: taller, error: tallerError } = (await this.supabase
      .from('talleres')
      .select('id, nombre, cupo')
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

    const {
      data: enrolledData,
      count: enrolledCount,
      error: countError,
    } = (await this.supabase
      .from('inscripciones')
      .select('id', { count: 'exact' })
      .eq('taller_id', dto.taller_id)) as {
      data: { id: string }[] | null;
      count: number | null;
      error: { message?: string } | null;
    };

    if (countError) this.fail('contar inscritos del taller', countError);
    const inscritos = enrolledCount ?? (enrolledData ? enrolledData.length : 0);
    const cupo = taller.cupo ?? 30;
    if (inscritos >= cupo) {
      throw new ConflictException('El taller no tiene cupo disponible.');
    }

    // 7. Empalmes de horario: verificar cruces con otros talleres activos del alumno
    const { data: activeInscriptions, error: activeInsError } =
      (await this.supabase
        .from('inscripciones')
        .select('taller_id')
        .eq('alumno_id', alumnoId)) as {
        data: { taller_id: string }[] | null;
        error: { message?: string } | null;
      };

    if (activeInsError) {
      this.fail('consultar talleres activos del alumno', activeInsError);
    }

    const enrolledTallerIds = (activeInscriptions ?? []).map(
      (ins) => ins.taller_id,
    );

    if (enrolledTallerIds.length > 0) {
      const { data: targetHorarios, error: targetHorError } =
        (await this.supabase
          .from('horarios')
          .select('id, taller_id, dia, hora_inicio, hora_fin')
          .eq('taller_id', dto.taller_id)) as {
          data: HorarioItem[] | null;
          error: { message?: string } | null;
        };

      if (targetHorError) {
        this.fail('consultar horarios del taller destino', targetHorError);
      }

      const { data: enrolledHorarios, error: enrHorError } =
        (await this.supabase
          .from('horarios')
          .select('id, taller_id, dia, hora_inicio, hora_fin')
          .in('taller_id', enrolledTallerIds)) as {
          data: HorarioItem[] | null;
          error: { message?: string } | null;
        };

      if (enrHorError) {
        this.fail('consultar horarios de talleres inscritos', enrHorError);
      }

      const targetList = targetHorarios ?? [];
      const enrolledList = enrolledHorarios ?? [];

      for (const th of targetList) {
        for (const eh of enrolledList) {
          if (th.dia.trim().toLowerCase() === eh.dia.trim().toLowerCase()) {
            if (
              this.timesOverlap(
                th.hora_inicio,
                th.hora_fin,
                eh.hora_inicio,
                eh.hora_fin,
              )
            ) {
              throw new ConflictException(
                'Conflicto de horario con otro taller ya inscrito en ese mismo día y bloque horario.',
              );
            }
          }
        }
      }
    }

    // 8. Insertar en public.inscripciones
    const { data: inserted, error: insertError } = (await this.supabase
      .from('inscripciones')
      .insert({ alumno_id: alumnoId, taller_id: dto.taller_id })
      .select('id, alumno_id, taller_id, created_at')
      .single()) as {
      data: {
        id: string;
        alumno_id: string;
        taller_id: string;
        created_at: string;
      } | null;
      error: { code?: string; message?: string } | null;
    };

    if (insertError) {
      if (this.isUniqueViolation(insertError)) {
        throw new ConflictException('Ya estás inscrito en este taller.');
      }
      this.fail('inscribir alumno en taller', insertError);
    }

    return {
      id: inserted!.id,
      alumno_id: inserted!.alumno_id,
      taller_id: inserted!.taller_id,
      taller_nombre: taller.nombre,
      created_at: inserted!.created_at,
    };
  }

  async baja(user: AuthUser, dto: BajaInscripcionDto): Promise<BajaResponse> {
    let alumnoId = user.id;
    if (user.role === 'admin' && dto.alumno_id) {
      alumnoId = dto.alumno_id;
    }

    // Verificar si la inscripción activa existe
    const { data: enrollment, error: enrollError } = (await this.supabase
      .from('inscripciones')
      .select('id, alumno_id, taller_id, talleres(id, nombre)')
      .eq('alumno_id', alumnoId)
      .eq('taller_id', dto.taller_id)
      .maybeSingle()) as {
      data: {
        id: string;
        alumno_id: string;
        taller_id: string;
        talleres: { id: string; nombre: string } | null;
      } | null;
      error: { message?: string } | null;
    };

    if (enrollError) this.fail('verificar inscripción para baja', enrollError);
    if (!enrollment) {
      throw new NotFoundException(
        'No se encontró una inscripción activa en este taller.',
      );
    }

    const tallerNombre = enrollment.talleres?.nombre ?? 'Taller';

    // Obtener perfil actual para calcular exactamente el decremento
    const { data: profile, error: profileError } = (await this.supabase
      .from('profiles')
      .select('cambios_restantes')
      .eq('id', alumnoId)
      .maybeSingle()) as {
      data: { cambios_restantes: number | null } | null;
      error: { message?: string } | null;
    };

    if (profileError) this.fail('consultar perfil para baja', profileError);
    const currentCambios = profile?.cambios_restantes ?? 3;
    const newCambios = Math.max(currentCambios - 1, 0);

    // Eliminar inscripción
    const { error: deleteError } = await this.supabase
      .from('inscripciones')
      .delete()
      .eq('alumno_id', alumnoId)
      .eq('taller_id', dto.taller_id);

    if (deleteError) this.fail('dar de baja la inscripción', deleteError);

    // Actualizar cambios_restantes para asegurar decremento atómico exacto
    const { error: updateError } = await this.supabase
      .from('profiles')
      .update({ cambios_restantes: newCambios })
      .eq('id', alumnoId);

    if (updateError) {
      this.logger.warn(
        `Error al actualizar cambios_restantes del alumno ${alumnoId}: ${updateError.message ?? 'desconocido'}`,
      );
    }

    return {
      success: true,
      cambios_restantes: newCambios,
      taller_nombre: tallerNombre,
    };
  }

  async getMisTalleres(userId: string): Promise<MiTallerInscrito[]> {
    const { data, error } = (await this.supabase
      .from('inscripciones')
      .select(
        'id, taller_id, created_at, talleres(id, nombre, categoria, lugar, instructor, instructor_id, cupo, horarios(id, taller_id, dia, hora_inicio, hora_fin))',
      )
      .eq('alumno_id', userId)) as {
      data: InscripcionJoinedRow[] | null;
      error: { message?: string } | null;
    };

    if (error) this.fail('consultar mis talleres', error);

    return (data ?? []).map((row) => ({
      id: row.id,
      taller_id: row.taller_id,
      taller_nombre: row.talleres?.nombre ?? '',
      categoria: row.talleres?.categoria ?? '',
      lugar: row.talleres?.lugar ?? '',
      instructor: row.talleres?.instructor ?? '',
      instructor_id: row.talleres?.instructor_id ?? null,
      cupo: row.talleres?.cupo ?? 0,
      horarios: row.talleres?.horarios ?? [],
      created_at: row.created_at,
    }));
  }

  async getRosterByTaller(
    user: AuthUser,
    tallerId: string,
  ): Promise<TallerRosterResponse> {
    const { data: taller, error: tallerError } = (await this.supabase
      .from('talleres')
      .select('id, nombre, cupo, instructor_id')
      .eq('id', tallerId)
      .maybeSingle()) as {
      data: {
        id: string;
        nombre: string;
        cupo: number;
        instructor_id: string | null;
      } | null;
      error: { message?: string } | null;
    };

    if (tallerError) this.fail('consultar taller para roster', tallerError);
    if (!taller) {
      throw new NotFoundException(`Taller con ID "${tallerId}" no encontrado.`);
    }

    if (user.role === 'instructor' && taller.instructor_id !== user.id) {
      throw new ForbiddenException(
        'No tienes permisos para consultar los inscritos de este taller.',
      );
    }

    const { data: inscripciones, error: insError } = (await this.supabase
      .from('inscripciones')
      .select(
        'id, alumno_id, created_at, profiles(id, nombre, matricula, turno)',
      )
      .eq('taller_id', tallerId)
      .order('created_at', { ascending: true })) as {
      data: InscripcionJoinedRow[] | null;
      error: { message?: string } | null;
    };

    if (insError) this.fail('consultar roster del taller', insError);

    const roster: AlumnoInscritoRosterItem[] = (inscripciones ?? []).map(
      (ins) => ({
        inscripcion_id: ins.id,
        alumno_id: ins.alumno_id,
        nombre: ins.profiles?.nombre ?? '',
        matricula: ins.profiles?.matricula ?? '',
        turno: ins.profiles?.turno ?? '',
        created_at: ins.created_at,
      }),
    );

    return {
      taller_id: taller.id,
      taller_nombre: taller.nombre,
      cupo: taller.cupo ?? 30,
      total: roster.length,
      inscritos: roster,
    };
  }

  async findAllAdmin(
    filter: FilterInscripcionDto,
  ): Promise<PaginatedInscripcionesAdmin> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('inscripciones')
      .select(
        'id, alumno_id, taller_id, created_at, profiles(id, nombre, matricula), talleres(id, nombre, categoria)',
        { count: 'exact' },
      );

    if (filter.taller_id) {
      query = query.eq('taller_id', filter.taller_id);
    }
    if (filter.alumno_id) {
      query = query.eq('alumno_id', filter.alumno_id);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = (await query) as {
      data: InscripcionJoinedRow[] | null;
      count: number | null;
      error: { message?: string } | null;
    };

    if (error) this.fail('listar inscripciones', error);

    const list: InscripcionAdminItem[] = (data ?? []).map((ins) => ({
      id: ins.id,
      alumno_id: ins.alumno_id,
      alumno_nombre: ins.profiles?.nombre ?? '',
      alumno_matricula: ins.profiles?.matricula ?? '',
      taller_id: ins.taller_id,
      taller_nombre: ins.talleres?.nombre ?? '',
      categoria: ins.talleres?.categoria ?? '',
      created_at: ins.created_at,
    }));

    return {
      data: list,
      total: count ?? list.length,
      page,
      limit,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    const code = (error as { code?: string })?.code;
    const msg = (error as { message?: string })?.message ?? '';
    return code === '23505' || /unique/i.test(msg);
  }

  private fail(op: string, error: { message?: string }): never {
    this.logger.error(`Error al ${op}: ${error?.message ?? 'desconocido'}`);
    throw new InternalServerErrorException(`No se pudo ${op}.`);
  }
}
