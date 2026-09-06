import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FilterInstructorDto } from './dto/filter-instructor.dto';
import type { UpdateInstructorDto } from './dto/update-instructor.dto';

export interface InstructorWorkshopRef {
  id: string;
  nombre: string;
}

export interface InstructorSummary {
  id: string;
  user_id: string;
  nombre: string;
  matricula: string;
  email: string;
  especialidad: string | null;
  telefono: string | null;
  activo: boolean;
  talleres: InstructorWorkshopRef[];
}

export interface TallerInstructorView {
  id: string;
  nombre: string;
  categoria: string;
  lugar: string;
  cupo: number;
  imagen_url?: string | null;
  descripcion?: string | null;
  alumnos_count: number;
  horarios: unknown[];
}

export interface InstructorDetail extends InstructorSummary {
  talleres_detalle: TallerInstructorView[];
}

interface InstructorRow {
  id: string;
  user_id: string;
  especialidad: string | null;
  telefono: string | null;
  activo: boolean | null;
  created_at: string;
}

interface ProfileLookupRow {
  id: string;
  nombre: string | null;
  matricula: string | null;
}

interface TallerLookupRow {
  id: string;
  nombre: string;
  instructor_id: string;
}

interface AuthUserRow {
  id: string;
  email: string | null;
}

interface TallerInstructorRow {
  id: string;
  nombre: string;
  categoria: string;
  lugar: string;
  cupo: number | null;
  imagen_url: string | null;
  descripcion: string | null;
  horarios: unknown[];
}

interface TallerCountRow {
  taller_id: string;
}

@Injectable()
export class InstructoresService {
  private readonly logger = new Logger(InstructoresService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient<any>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async findAll(filter: FilterInstructorDto): Promise<InstructorSummary[]> {
    let query = this.supabase
      .from('instructores')
      .select('id, user_id, especialidad, telefono, activo, created_at')
      .order('created_at', { ascending: false });

    if (filter.activo !== undefined) {
      query = query.eq('activo', filter.activo);
    }

    const { data: rows, error } = await query;
    if (error) this.fail('listar instructores', error);

    const instructoresList = (rows ?? []) as unknown as InstructorRow[];
    const userIds = instructoresList.map((r) => r.user_id);

    const profilesMap = new Map<
      string,
      { nombre: string; matricula: string }
    >();
    const emailsMap = await this.fetchEmails(userIds);
    const talleresMap = new Map<string, InstructorWorkshopRef[]>();

    if (userIds.length > 0) {
      const { data: profilesData } = await this.supabase
        .from('profiles')
        .select('id, nombre, matricula')
        .in('id', userIds);

      if (profilesData) {
        const profRows = profilesData as unknown as ProfileLookupRow[];
        for (const p of profRows) {
          profilesMap.set(p.id, {
            nombre: p.nombre ?? '',
            matricula: p.matricula ?? '',
          });
        }
      }

      const { data: talleresData } = await this.supabase
        .from('talleres')
        .select('id, nombre, instructor_id')
        .in('instructor_id', userIds);

      if (talleresData) {
        const tallerRows = talleresData as unknown as TallerLookupRow[];
        for (const t of tallerRows) {
          const list = talleresMap.get(t.instructor_id) ?? [];
          list.push({ id: t.id, nombre: t.nombre });
          talleresMap.set(t.instructor_id, list);
        }
      }
    }

    let results: InstructorSummary[] = instructoresList.map((inst) => {
      const profile = profilesMap.get(inst.user_id) ?? {
        nombre: '',
        matricula: '',
      };
      return {
        id: inst.id,
        user_id: inst.user_id,
        nombre: profile.nombre,
        matricula: profile.matricula,
        email: emailsMap.get(inst.user_id) ?? '',
        especialidad: inst.especialidad ?? null,
        telefono: inst.telefono ?? null,
        activo: inst.activo ?? true,
        talleres: talleresMap.get(inst.user_id) ?? [],
      };
    });

    if (filter.q) {
      const term = filter.q.toLowerCase();
      results = results.filter(
        (i) =>
          i.nombre.toLowerCase().includes(term) ||
          i.matricula.toLowerCase().includes(term) ||
          (i.especialidad && i.especialidad.toLowerCase().includes(term)) ||
          i.email.toLowerCase().includes(term),
      );
    }

    return results;
  }

  async getMyTalleres(userId: string): Promise<TallerInstructorView[]> {
    const { data: talleres, error } = await this.supabase
      .from('talleres')
      .select(
        'id, nombre, categoria, lugar, cupo, imagen_url, descripcion, horarios(id, taller_id, dia, hora_inicio, hora_fin)',
      )
      .eq('instructor_id', userId)
      .order('nombre', { ascending: true });

    if (error) this.fail(`obtener talleres del instructor ${userId}`, error);

    const talleresList = (talleres ?? []) as unknown as TallerInstructorRow[];
    const tallerIds = talleresList.map((t) => t.id);
    const countMap = new Map<string, number>();

    if (tallerIds.length > 0) {
      const { data: insData, error: insError } = await this.supabase
        .from('inscripciones')
        .select('taller_id')
        .in('taller_id', tallerIds);

      if (insError) {
        this.logger.warn(
          `Error al contar alumnos de talleres: ${insError.message ?? 'desconocido'}`,
        );
      } else if (insData) {
        const countRows = insData as unknown as TallerCountRow[];
        for (const row of countRows) {
          countMap.set(row.taller_id, (countMap.get(row.taller_id) ?? 0) + 1);
        }
      }
    }

    return talleresList.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      categoria: t.categoria,
      lugar: t.lugar,
      cupo: t.cupo ?? 0,
      imagen_url: t.imagen_url ?? null,
      descripcion: t.descripcion ?? null,
      alumnos_count: countMap.get(t.id) ?? 0,
      horarios: t.horarios ?? [],
    }));
  }

  async findOne(id: string): Promise<InstructorDetail> {
    const { data: instData, error } = (await this.supabase
      .from('instructores')
      .select('*')
      .eq('id', id)
      .maybeSingle()) as {
      data: InstructorRow | null;
      error: { message?: string } | null;
    };

    let instructor: InstructorRow | null = instData ?? null;

    if (!instructor) {
      const { data: byUserId, error: errUser } = (await this.supabase
        .from('instructores')
        .select('*')
        .eq('user_id', id)
        .maybeSingle()) as {
        data: InstructorRow | null;
        error: { message?: string } | null;
      };
      if (!errUser && byUserId) {
        instructor = byUserId;
      }
    }

    if (error) this.fail(`obtener instructor ${id}`, error);
    if (!instructor) {
      throw new NotFoundException(`Instructor con id "${id}" no encontrado.`);
    }

    const { data: profile } = (await this.supabase
      .from('profiles')
      .select('nombre, matricula')
      .eq('id', instructor.user_id)
      .maybeSingle()) as {
      data: ProfileLookupRow | null;
      error: { message?: string } | null;
    };

    const profRow = profile;
    const emailsMap = await this.fetchEmails([instructor.user_id]);
    const talleresDetalle = await this.getMyTalleres(instructor.user_id);

    return {
      id: instructor.id,
      user_id: instructor.user_id,
      nombre: profRow?.nombre ?? '',
      matricula: profRow?.matricula ?? '',
      email: emailsMap.get(instructor.user_id) ?? '',
      especialidad: instructor.especialidad ?? null,
      telefono: instructor.telefono ?? null,
      activo: instructor.activo ?? true,
      talleres: talleresDetalle.map((t) => ({ id: t.id, nombre: t.nombre })),
      talleres_detalle: talleresDetalle,
    };
  }

  async update(
    id: string,
    dto: UpdateInstructorDto,
  ): Promise<InstructorDetail> {
    const { data: existing, error: existError } = (await this.supabase
      .from('instructores')
      .select('*')
      .eq('id', id)
      .maybeSingle()) as {
      data: InstructorRow | null;
      error: { message?: string } | null;
    };

    if (existError) this.fail(`verificar instructor ${id}`, existError);
    if (!existing) {
      throw new NotFoundException(`Instructor con id "${id}" no encontrado.`);
    }

    const typedExisting = existing;

    const patch: Partial<InstructorRow> = {};
    if (dto.especialidad !== undefined) patch.especialidad = dto.especialidad;
    if (dto.telefono !== undefined) patch.telefono = dto.telefono;
    if (dto.activo !== undefined) patch.activo = dto.activo;

    if (Object.keys(patch).length > 0) {
      const { error: updateError } = await this.supabase
        .from('instructores')
        .update(patch)
        .eq('id', id);
      if (updateError) this.fail(`actualizar instructor ${id}`, updateError);
    }

    if (dto.taller_id !== undefined) {
      if (dto.taller_id === null) {
        const { error: unassignError } = await this.supabase
          .from('talleres')
          .update({ instructor_id: null, instructor: 'Sin asignar' })
          .eq('instructor_id', typedExisting.user_id);

        if (unassignError) {
          this.fail(`desasignar talleres del instructor ${id}`, unassignError);
        }
      } else {
        const { data: profile } = (await this.supabase
          .from('profiles')
          .select('nombre')
          .eq('id', typedExisting.user_id)
          .maybeSingle()) as {
          data: { nombre: string | null } | null;
          error: { message?: string } | null;
        };

        const profRow = profile;
        const instructorNombre = profRow?.nombre ?? 'Instructor Asignado';

        const { error: assignError } = await this.supabase
          .from('talleres')
          .update({
            instructor_id: typedExisting.user_id,
            instructor: instructorNombre,
          })
          .eq('id', dto.taller_id);

        if (assignError) {
          this.fail(
            `asignar instructor al taller ${dto.taller_id}`,
            assignError,
          );
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ id: string; deactivated: true }> {
    const { data: existing, error: existError } = (await this.supabase
      .from('instructores')
      .select('*')
      .eq('id', id)
      .maybeSingle()) as {
      data: InstructorRow | null;
      error: { message?: string } | null;
    };

    if (existError) this.fail(`verificar instructor ${id}`, existError);
    if (!existing) {
      throw new NotFoundException(`Instructor con id "${id}" no encontrado.`);
    }

    const typedExisting = existing;

    const { error: deactError } = await this.supabase
      .from('instructores')
      .update({ activo: false })
      .eq('id', id);

    if (deactError) this.fail(`desactivar instructor ${id}`, deactError);

    const { error: unassignError } = await this.supabase
      .from('talleres')
      .update({ instructor_id: null, instructor: 'Sin asignar' })
      .eq('instructor_id', typedExisting.user_id);

    if (unassignError) {
      this.logger.warn(
        `Error al desasignar talleres al desactivar instructor: ${unassignError.message ?? 'desconocido'}`,
      );
    }

    return { id, deactivated: true };
  }

  private async fetchEmails(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (userIds.length === 0) return map;

    try {
      const { data: usersData, error } = await this.supabase
        .schema('auth')
        .from('users')
        .select('id, email')
        .in('id', userIds);

      if (!error && usersData) {
        const authRows = usersData as unknown as AuthUserRow[];
        for (const u of authRows) {
          if (u.id && u.email) map.set(u.id, u.email);
        }
        return map;
      }
    } catch {
      // ignore
    }

    try {
      const { data: adminUsers } = await this.supabase.auth.admin.listUsers();
      if (adminUsers?.users) {
        for (const u of adminUsers.users) {
          if (
            u &&
            typeof u.id === 'string' &&
            typeof u.email === 'string' &&
            userIds.includes(u.id)
          ) {
            map.set(u.id, u.email);
          }
        }
      }
    } catch {
      // ignore
    }

    return map;
  }

  private fail(op: string, error: { message?: string }): never {
    this.logger.error(`Error al ${op}: ${error.message ?? 'desconocido'}`);
    throw new InternalServerErrorException(`No se pudo ${op}.`);
  }
}
