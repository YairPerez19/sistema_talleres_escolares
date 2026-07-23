import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { CreateTallerDto } from './dto/create-taller.dto';
import type { UpdateTallerDto } from './dto/update-taller.dto';
import type { FilterTallerDto } from './dto/filter-taller.dto';
import type {
  Horario,
  Taller,
  TallerConCupo,
  TallerConHorarios,
} from './taller.entity';

@Injectable()
export class TalleresService {
  private readonly logger = new Logger(TalleresService.name);
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async findAll(filter: FilterTallerDto): Promise<TallerConCupo[]> {
    let query = this.supabase
      .from('talleres')
      .select('*, horarios(id, taller_id, dia, hora_inicio, hora_fin)')
      .order('nombre', { ascending: true });

    if (filter.categoria) query = query.eq('categoria', filter.categoria);
    if (filter.instructor_id) query = query.eq('instructor_id', filter.instructor_id);
    if (filter.q) query = query.ilike('nombre', `%${filter.q}%`);

    const { data, error } = await query;
    if (error) this.fail('listar talleres', error);

    const talleres = (data ?? []) as unknown as TallerConHorarios[];
    const ids = talleres.map((t) => t.id);
    const counts = await this.countInscritos(ids);

    let result = talleres.map((t) => this.attachCupo(t, counts.get(t.id) ?? 0));
    if (filter.disponible !== undefined) {
      result = result.filter((t) => t.disponible === filter.disponible);
    }
    return result;
  }

  async findOne(id: string): Promise<TallerConCupo> {
    const { data, error } = await this.supabase
      .from('talleres')
      .select('*, horarios(id, taller_id, dia, hora_inicio, hora_fin)')
      .eq('id', id)
      .maybeSingle();

    if (error) this.fail(`obtener taller ${id}`, error);
    if (!data) throw new NotFoundException(`Taller ${id} no encontrado.`);

    const counts = await this.countInscritos([id]);
    return this.attachCupo(
      data as unknown as TallerConHorarios,
      counts.get(id) ?? 0,
    );
  }

  async create(dto: CreateTallerDto): Promise<TallerConHorarios> {
    const { horarios, ...tallerFields } = dto;

    const { data, error } = await this.supabase
      .from('talleres')
      .insert(tallerFields)
      .select('*')
      .single();

    if (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Ya existe un taller con esos datos únicos.');
      }
      this.fail('crear taller', error);
    }

    const taller = data as Taller;
    if (horarios && horarios.length > 0) {
      await this.replaceHorarios(taller.id, horarios);
    }
    return this.findOne(taller.id);
  }

  async update(id: string, dto: UpdateTallerDto): Promise<TallerConHorarios> {
    const existing = await this.findOne(id);

    const { horarios, ...patch } = dto;

    if (patch.cupo !== undefined && patch.cupo < existing.inscritos) {
      throw new BadRequestException(
        `El cupo (${patch.cupo}) no puede ser menor que los inscritos actuales (${existing.inscritos}).`,
      );
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await this.supabase
        .from('talleres')
        .update(patch)
        .eq('id', id);
      if (error) {
        if (this.isUniqueViolation(error)) {
          throw new ConflictException('Conflicto de unicidad al actualizar.');
        }
        this.fail(`actualizar taller ${id}`, error);
      }
    }

    if (horarios !== undefined) {
      await this.replaceHorarios(id, horarios);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ id: string; deleted: true }> {
    const existing = await this.findOne(id);

    if (existing.inscritos > 0) {
      throw new ConflictException(
        `No se puede eliminar: el taller tiene ${existing.inscritos} inscrito(s). Da de baja primero.`,
      );
    }

    const { error } = await this.supabase.from('talleres').delete().eq('id', id);
    if (error) this.fail(`eliminar taller ${id}`, error);
    return { id, deleted: true };
  }

  private async replaceHorarios(
    tallerId: string,
    horarios: { dia: string; hora_inicio: string; hora_fin: string }[],
  ): Promise<Horario[]> {
    const { error: delError } = await this.supabase
      .from('horarios')
      .delete()
      .eq('taller_id', tallerId);
    if (delError) this.fail(`limpiar horarios de ${tallerId}`, delError);

    if (horarios.length === 0) return [];

    const rows = horarios.map((h) => ({ ...h, taller_id: tallerId }));
    const { data, error } = await this.supabase
      .from('horarios')
      .insert(rows)
      .select('*');
    if (error) this.fail(`insertar horarios de ${tallerId}`, error);
    return (data ?? []) as Horario[];
  }

  private async countInscritos(
    tallerIds: string[],
  ): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (tallerIds.length === 0) return counts;

    const { data, error } = await this.supabase
      .from('inscripciones')
      .select('taller_id')
      .in('taller_id', tallerIds);

    if (error) this.fail('contar inscritos', error);
    for (const row of (data ?? []) as { taller_id: string }[]) {
      counts.set(row.taller_id, (counts.get(row.taller_id) ?? 0) + 1);
    }
    return counts;
  }

  private attachCupo(
    taller: TallerConHorarios,
    inscritos: number,
  ): TallerConCupo {
    return {
      ...taller,
      inscritos,
      disponible: inscritos < taller.cupo,
    };
  }

  private isUniqueViolation(error: { code?: string; message?: string }): boolean {
    return (
      error.code === '23505' ||
      error.message?.toLowerCase().includes('duplicate key') === true
    );
  }

  private fail(op: string, error: { message?: string }): never {
    this.logger.error(`Error al ${op}: ${error.message ?? 'desconocido'}`);
    throw new InternalServerErrorException(`No se pudo ${op}.`);
  }
}
