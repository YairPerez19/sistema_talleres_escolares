import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FilterAlumnoDto } from './dto/filter-alumno.dto';
import type { UpdateAlumnoDto } from './dto/update-alumno.dto';

export interface AlumnoSummary {
  id: string;
  nombre: string;
  matricula: string;
  turno: string;
  cambios_restantes: number;
  inscripcion_limite: string;
  talleres_count: number;
  deuda_total: number;
}

export interface AlumnoInscripcion {
  id: string;
  taller_id: string;
  taller_nombre: string;
  categoria: string;
  lugar: string;
  instructor: string;
  horarios: unknown[];
  created_at: string;
}

export interface AlumnoDetail {
  id: string;
  nombre: string;
  matricula: string;
  turno: string;
  cambios_restantes: number;
  inscripcion_limite: string;
  deuda_total: number;
  inscripciones: AlumnoInscripcion[];
}

export interface ProfileRow {
  id: string;
  nombre: string;
  matricula: string;
  turno: string;
  cambios_restantes: number | null;
  inscripcion_limite: string;
  created_at?: string;
}

interface InscripcionItemRow {
  alumno_id: string;
}

interface DeudaItemRow {
  alumno_id: string;
  deuda_total: number | null;
}

interface InscripcionDetailRow {
  id: string;
  taller_id: string;
  created_at: string;
  talleres: {
    id: string;
    nombre: string;
    categoria: string;
    lugar: string;
    instructor: string;
    cupo: number;
    horarios: unknown[];
  } | null;
}

@Injectable()
export class AlumnosService {
  private readonly logger = new Logger(AlumnosService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient<any>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async getProfileMe(userId: string): Promise<AlumnoDetail> {
    return this.findOne(userId);
  }

  async findAll(filter: FilterAlumnoDto): Promise<{
    data: AlumnoSummary[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const offset = (page - 1) * limit;

    let query = this.supabase
      .from('profiles')
      .select(
        'id, nombre, matricula, turno, cambios_restantes, inscripcion_limite',
        { count: 'exact' },
      );

    if (filter.turno) {
      query = query.eq('turno', filter.turno);
    }
    if (filter.q) {
      query = query.or(
        `nombre.ilike.%${filter.q}%,matricula.ilike.%${filter.q}%`,
      );
    }

    query = query
      .order('nombre', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data: profiles, count, error } = await query;
    if (error) this.fail('listar alumnos', error);

    const profileList = (profiles ?? []) as unknown as ProfileRow[];
    const studentIds = profileList.map((p) => p.id);

    const countsMap = new Map<string, number>();
    const debtsMap = new Map<string, number>();

    if (studentIds.length > 0) {
      const { data: insData, error: insError } = await this.supabase
        .from('inscripciones')
        .select('alumno_id')
        .in('alumno_id', studentIds);

      if (insError) {
        this.logger.warn(
          `Error al contar inscripciones: ${insError.message ?? 'desconocido'}`,
        );
      } else if (insData) {
        const insRows = insData as unknown as InscripcionItemRow[];
        for (const row of insRows) {
          countsMap.set(row.alumno_id, (countsMap.get(row.alumno_id) ?? 0) + 1);
        }
      }

      const { data: debtsData, error: debtsError } = await this.supabase
        .from('deuda_alumnos')
        .select('alumno_id, deuda_total')
        .in('alumno_id', studentIds);

      if (debtsError) {
        this.logger.warn(
          `Error al consultar deudas: ${debtsError.message ?? 'desconocido'}`,
        );
      } else if (debtsData) {
        const debtRows = debtsData as unknown as DeudaItemRow[];
        for (const row of debtRows) {
          debtsMap.set(row.alumno_id, Number(row.deuda_total ?? 0));
        }
      }
    }

    const data: AlumnoSummary[] = profileList.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      matricula: p.matricula,
      turno: p.turno,
      cambios_restantes: p.cambios_restantes ?? 3,
      inscripcion_limite: p.inscripcion_limite,
      talleres_count: countsMap.get(p.id) ?? 0,
      deuda_total: debtsMap.get(p.id) ?? 0,
    }));

    return {
      data,
      total: count ?? data.length,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<AlumnoDetail> {
    const { data: profile, error } = (await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()) as {
      data: ProfileRow | null;
      error: { message?: string } | null;
    };

    if (error) this.fail(`obtener alumno ${id}`, error);
    if (!profile) {
      throw new NotFoundException(`Alumno con id "${id}" no encontrado.`);
    }

    const typedProfile = profile;

    const { data: debtData, error: debtError } = (await this.supabase
      .from('deuda_alumnos')
      .select('*')
      .eq('alumno_id', id)
      .maybeSingle()) as {
      data: DeudaItemRow | null;
      error: { message?: string } | null;
    };

    if (debtError) {
      this.logger.warn(
        `Error al consultar deuda de alumno ${id}: ${debtError.message ?? 'desconocido'}`,
      );
    }

    const typedDebt = debtData;

    const { data: inscripcionesData, error: inscError } = await this.supabase
      .from('inscripciones')
      .select(
        'id, taller_id, created_at, talleres(id, nombre, categoria, lugar, instructor, cupo, horarios(id, taller_id, dia, hora_inicio, hora_fin))',
      )
      .eq('alumno_id', id);

    if (inscError) {
      this.fail(`obtener inscripciones de alumno ${id}`, inscError);
    }

    const inscRows = (inscripcionesData ??
      []) as unknown as InscripcionDetailRow[];

    const inscripciones: AlumnoInscripcion[] = inscRows.map((ins) => ({
      id: ins.id,
      taller_id: ins.taller_id,
      taller_nombre: ins.talleres?.nombre ?? '',
      categoria: ins.talleres?.categoria ?? '',
      lugar: ins.talleres?.lugar ?? '',
      instructor: ins.talleres?.instructor ?? '',
      horarios: ins.talleres?.horarios ?? [],
      created_at: ins.created_at,
    }));

    return {
      id: typedProfile.id,
      nombre: typedProfile.nombre,
      matricula: typedProfile.matricula,
      turno: typedProfile.turno,
      cambios_restantes: typedProfile.cambios_restantes ?? 3,
      inscripcion_limite: typedProfile.inscripcion_limite,
      deuda_total: Number(typedDebt?.deuda_total ?? 0),
      inscripciones,
    };
  }

  async update(id: string, dto: UpdateAlumnoDto): Promise<ProfileRow> {
    const { data: existing, error: existError } = (await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()) as {
      data: ProfileRow | null;
      error: { message?: string } | null;
    };

    if (existError) this.fail(`verificar alumno ${id}`, existError);
    if (!existing) {
      throw new NotFoundException(`Alumno con id "${id}" no encontrado.`);
    }

    const typedExisting = existing;

    const patch: Partial<ProfileRow> = {};
    if (dto.nombre !== undefined) patch.nombre = dto.nombre;
    if (dto.turno !== undefined) patch.turno = dto.turno;
    if (dto.cambios_restantes !== undefined) {
      patch.cambios_restantes = dto.cambios_restantes;
    }
    if (dto.inscripcion_limite !== undefined) {
      patch.inscripcion_limite = dto.inscripcion_limite;
    }

    if (Object.keys(patch).length === 0) {
      return typedExisting;
    }

    const { data: updated, error: updateError } = (await this.supabase
      .from('profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()) as {
      data: ProfileRow | null;
      error: { message?: string } | null;
    };

    if (updateError) this.fail(`actualizar alumno ${id}`, updateError);
    return updated ?? typedExisting;
  }

  private fail(op: string, error: { message?: string }): never {
    this.logger.error(`Error al ${op}: ${error.message ?? 'desconocido'}`);
    throw new InternalServerErrorException(`No se pudo ${op}.`);
  }
}
