import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { FilterAdeudosDto } from './dto/filter-adeudos.dto';
import type { LiquidarAdeudoDto } from './dto/liquidar-adeudo.dto';

export interface DeudaDetalleResponse {
  alumno_id: string;
  sesiones_asistidas: number;
  faltas_injustificadas: number;
  faltas_justificadas: number;
  retardos: number;
  total_sesiones: number;
  porcentaje_asistencia: number;
  deuda_total: number;
  tarifa_por_sesion: number;
}

export interface AlumnoDeudaItem {
  alumno_id: string;
  nombre: string;
  matricula: string;
  turno: string;
  sesiones_asistidas: number;
  faltas_injustificadas: number;
  faltas_justificadas: number;
  retardos: number;
  total_sesiones: number;
  porcentaje_asistencia: number;
  deuda_total: number;
}

export interface PaginatedAdeudosResponse {
  data: AlumnoDeudaItem[];
  total: number;
  page: number;
  limit: number;
}

export interface LiquidarAdeudoResponse {
  alumno_id: string;
  liquidado: boolean;
  monto_pagado: number;
  saldo_restante: number;
  fecha_pago: string;
}

interface ProfileRow {
  id: string;
  nombre: string;
  matricula: string;
  turno: string;
}

interface AsistenciaRow {
  alumno_id?: string;
  estado: string;
}

export const TARIFA_POR_SESION = 25.0;

@Injectable()
export class AdeudosService {
  private readonly logger = new Logger(AdeudosService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient<any>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async getDebtForStudent(
    alumnoId: string,
    verifyProfile = true,
  ): Promise<DeudaDetalleResponse> {
    if (verifyProfile) {
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('id, nombre')
        .eq('id', alumnoId)
        .maybeSingle();

      if (profileError) {
        this.logger.error(
          `Error al verificar perfil de alumno ${alumnoId}: ${profileError.message}`,
        );
        throw new InternalServerErrorException(
          `Error al verificar alumno: ${profileError.message}`,
        );
      }

      if (!profile) {
        throw new NotFoundException(`Alumno con ID ${alumnoId} no encontrado.`);
      }
    }

    const { data: asistencias, error: asistenciasError } = await this.supabase
      .from('asistencias')
      .select('estado')
      .eq('alumno_id', alumnoId);

    if (asistenciasError) {
      this.logger.error(
        `Error al consultar asistencias de alumno ${alumnoId}: ${asistenciasError.message}`,
      );
      throw new InternalServerErrorException(
        `Error al consultar asistencias: ${asistenciasError.message}`,
      );
    }

    const rows = (asistencias ?? []) as AsistenciaRow[];
    let presentes = 0;
    let retardos = 0;
    let faltasInjustificadas = 0;
    let faltasJustificadas = 0;

    for (const r of rows) {
      if (r.estado === 'presente') presentes++;
      else if (r.estado === 'retardo') retardos++;
      else if (r.estado === 'ausente') faltasInjustificadas++;
      else if (r.estado === 'justificado') faltasJustificadas++;
    }

    const totalSesiones = rows.length;
    const porcentajeAsistencia =
      totalSesiones > 0
        ? Math.round(((presentes + retardos) / totalSesiones) * 1000) / 10
        : 0;

    // Fórmula: (sesiones_asistidas + retardos + faltas_injustificadas) * 25
    const deudaTotal =
      (presentes + retardos + faltasInjustificadas) * TARIFA_POR_SESION;

    return {
      alumno_id: alumnoId,
      sesiones_asistidas: presentes,
      faltas_injustificadas: faltasInjustificadas,
      faltas_justificadas: faltasJustificadas,
      retardos,
      total_sesiones: totalSesiones,
      porcentaje_asistencia: porcentajeAsistencia,
      deuda_total: deudaTotal,
      tarifa_por_sesion: TARIFA_POR_SESION,
    };
  }

  async findAll(query: FilterAdeudosDto): Promise<PaginatedAdeudosResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let profilesQuery = this.supabase
      .from('profiles')
      .select('id, nombre, matricula, turno');

    if (query.q) {
      const q = query.q;
      profilesQuery = profilesQuery.or(
        `nombre.ilike.%${q}%,matricula.ilike.%${q}%`,
      );
    }

    const { data: profilesData, error: profilesError } =
      await profilesQuery.order('nombre', { ascending: true });

    if (profilesError) {
      this.logger.error(
        `Error al consultar perfiles de alumnos: ${profilesError.message}`,
      );
      throw new InternalServerErrorException(
        `Error al consultar alumnos: ${profilesError.message}`,
      );
    }

    const profiles = (profilesData ?? []) as ProfileRow[];
    if (profiles.length === 0) {
      return { data: [], total: 0, page, limit };
    }

    const studentIds = profiles.map((p) => p.id);
    const { data: asistenciasData, error: asistenciasError } =
      await this.supabase
        .from('asistencias')
        .select('alumno_id, estado')
        .in('alumno_id', studentIds);

    if (asistenciasError) {
      this.logger.error(
        `Error al consultar asistencias para adeudos: ${asistenciasError.message}`,
      );
      throw new InternalServerErrorException(
        `Error al consultar asistencias: ${asistenciasError.message}`,
      );
    }

    type Counters = {
      presentes: number;
      retardos: number;
      faltasInjustificadas: number;
      faltasJustificadas: number;
      total: number;
    };

    const countersMap = new Map<string, Counters>();
    const asistencias = (asistenciasData ?? []) as AsistenciaRow[];

    for (const a of asistencias) {
      if (!a.alumno_id) continue;
      let c = countersMap.get(a.alumno_id);
      if (!c) {
        c = {
          presentes: 0,
          retardos: 0,
          faltasInjustificadas: 0,
          faltasJustificadas: 0,
          total: 0,
        };
        countersMap.set(a.alumno_id, c);
      }
      c.total++;
      if (a.estado === 'presente') c.presentes++;
      else if (a.estado === 'retardo') c.retardos++;
      else if (a.estado === 'ausente') c.faltasInjustificadas++;
      else if (a.estado === 'justificado') c.faltasJustificadas++;
    }

    let items: AlumnoDeudaItem[] = profiles.map((p) => {
      const c = countersMap.get(p.id) ?? {
        presentes: 0,
        retardos: 0,
        faltasInjustificadas: 0,
        faltasJustificadas: 0,
        total: 0,
      };

      const porcentaje =
        c.total > 0
          ? Math.round(((c.presentes + c.retardos) / c.total) * 1000) / 10
          : 0;

      const deuda =
        (c.presentes + c.retardos + c.faltasInjustificadas) * TARIFA_POR_SESION;

      return {
        alumno_id: p.id,
        nombre: p.nombre,
        matricula: p.matricula,
        turno: p.turno,
        sesiones_asistidas: c.presentes,
        faltas_injustificadas: c.faltasInjustificadas,
        faltas_justificadas: c.faltasJustificadas,
        retardos: c.retardos,
        total_sesiones: c.total,
        porcentaje_asistencia: porcentaje,
        deuda_total: deuda,
      };
    });

    if (query.con_deuda_only) {
      items = items.filter((item) => item.deuda_total > 0);
    }

    const total = items.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      data: paginatedItems,
      total,
      page,
      limit,
    };
  }

  async liquidar(
    alumnoId: string,
    dto: LiquidarAdeudoDto,
  ): Promise<LiquidarAdeudoResponse> {
    const debtInfo = await this.getDebtForStudent(alumnoId, true);
    const currentDebt = debtInfo.deuda_total;

    const montoPagado = dto.monto !== undefined ? dto.monto : currentDebt;
    const saldoRestante = Math.max(0, currentDebt - montoPagado);
    const liquidado = saldoRestante === 0;
    const fechaPago = new Date().toISOString();

    this.logger.log(
      `Adeudo liquidado para alumno ${alumnoId}. Deuda previa: $${currentDebt}, Monto pagado: $${montoPagado}, Saldo restante: $${saldoRestante}, Ref: ${dto.referencia ?? 'N/A'}`,
    );

    return {
      alumno_id: alumnoId,
      liquidado,
      monto_pagado: montoPagado,
      saldo_restante: saldoRestante,
      fecha_pago: fechaPago,
    };
  }
}
