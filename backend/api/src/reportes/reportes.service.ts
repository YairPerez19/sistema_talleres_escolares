import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ReportesDashboardQueryDto,
  ReportesAsistenciaQueryDto,
  ReportesTalleresQueryDto,
} from './dto/reportes-query.dto';

export interface AdminStats {
  totalSesiones: number;
  promedioAsistencia: number;
  promedioSemanaPasada: number;
  talleresActivos: number;
  sesionesHoy: number;
  sesionesAyer: number;
  distribucionEstados: {
    presente: number;
    ausente: number;
    retardo: number;
    justificado: number;
    sin_registro: number;
  };
  asistenciaPorDia: {
    fecha: string;
    label: string;
    total: number;
    presentes: number;
    ausentes: number;
    retardos: number;
    justificados: number;
  }[];
  topTalleres: {
    id: string;
    nombre: string;
    categoria: string;
    registros: number;
    promedio: number;
  }[];
  categorias: {
    nombre: string;
    total: number;
    talleres: number;
  }[];
  alumnosConMasFaltas: {
    alumno_id: string;
    nombre: string;
    matricula?: string;
    faltas: number;
  }[];
  actividadReciente: {
    id: string;
    fecha: string;
    hora: string | null;
    estado: string;
    alumno: string;
    matricula: string;
    taller: string;
  }[];
}

export interface AsistenciaReportRecord {
  id: string;
  fecha: string;
  hora: string | null;
  estado: string;
  observaciones: string | null;
  alumno_id: string;
  taller_id: string;
  profiles: {
    id?: string;
    nombre: string;
    matricula: string;
  } | null;
  talleres: {
    id?: string;
    nombre: string;
    categoria: string;
  } | null;
}

export interface WorkshopStatsSummary {
  taller_id: string;
  taller_nombre: string;
  categoria: string;
  instructor: string;
  alumnos_registrados: number;
  asistencias_totales: number;
  faltas_totales: number;
  sesiones_tomadas: number;
  porcentaje_asistencia_global: number;
}

interface EstadisticaTallerRow {
  taller_id: string;
  taller_nombre: string;
  categoria: string;
  instructor: string | null;
  alumnos_registrados: number | null;
  asistencias_totales: number | null;
  faltas_totales: number | null;
  sesiones_tomadas: number | null;
  porcentaje_asistencia_global: number | null;
}

interface AsistenciaRawRow {
  id: string;
  fecha: string;
  hora: string | null;
  estado: string;
  observaciones: string | null;
  alumno_id: string;
  taller_id: string;
  profiles:
    | { id?: string; nombre: string; matricula: string }
    | { id?: string; nombre: string; matricula: string }[]
    | null;
  talleres:
    | { id?: string; nombre: string; categoria: string }
    | { id?: string; nombre: string; categoria: string }[]
    | null;
}

interface TallerComputeRow {
  id: string;
  nombre: string;
  categoria: string;
  instructor: string | null;
}

interface InscripcionComputeRow {
  taller_id: string;
  alumno_id: string;
}

interface AsistenciaComputeRow {
  taller_id: string;
  fecha: string;
  estado: string;
}

interface ProfileRow {
  id: string;
  nombre: string;
  matricula: string;
}

@Injectable()
export class ReportesService {
  private readonly logger = new Logger(ReportesService.name);
  private supabase: SupabaseClient<any>;

  constructor(private configService: ConfigService) {
    this.supabase = createClient<any>(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }

  async getDashboardStats(
    query?: ReportesDashboardQueryDto,
  ): Promise<AdminStats> {
    const dias = query?.dias ?? 7;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const haceRango = new Date(today);
    haceRango.setDate(today.getDate() - (dias - 1));
    const haceRangoStr = haceRango.toISOString().split('T')[0];

    const haceRangoDoble = new Date(today);
    haceRangoDoble.setDate(today.getDate() - (2 * dias - 1));
    const haceRangoDobleStr = haceRangoDoble.toISOString().split('T')[0];

    const [
      totalRes,
      hoyRes,
      ayerRes,
      talleresRes,
      ultimosRes,
      semanaPasadaRes,
      topTalleresRes,
      actividadRes,
      talleresFullRes,
      deudaRes,
    ] = await Promise.all([
      this.supabase
        .from('asistencias')
        .select('*', { count: 'exact', head: true }),
      this.supabase
        .from('asistencias')
        .select('*', { count: 'exact', head: true })
        .eq('fecha', todayStr),
      this.supabase
        .from('asistencias')
        .select('*', { count: 'exact', head: true })
        .eq('fecha', yesterdayStr),
      this.supabase
        .from('talleres')
        .select('*', { count: 'exact', head: true }),
      this.supabase
        .from('asistencias')
        .select('fecha, estado')
        .gte('fecha', haceRangoStr)
        .lte('fecha', todayStr),
      this.supabase
        .from('asistencias')
        .select('estado')
        .gte('fecha', haceRangoDobleStr)
        .lt('fecha', haceRangoStr),
      this.supabase
        .from('asistencias')
        .select('taller_id, estado, talleres(nombre, categoria)')
        .gte('fecha', haceRangoStr)
        .lte('fecha', todayStr)
        .limit(2000),
      this.supabase
        .from('asistencias')
        .select(
          'id, fecha, hora, estado, profiles(nombre, matricula), talleres(nombre)',
        )
        .order('created_at', { ascending: false })
        .limit(6),
      this.supabase.from('talleres').select('id, nombre, categoria'),
      this.supabase
        .from('deuda_alumnos')
        .select('alumno_id, faltas_injustificadas')
        .order('faltas_injustificadas', { ascending: false })
        .limit(5),
    ]);

    if (ultimosRes.error) {
      this.logger.error(
        `Error al consultar ultimas asistencias: ${ultimosRes.error.message}`,
      );
    }

    const ultimosData = (ultimosRes.data ?? []) as {
      fecha: string;
      estado: string;
    }[];
    const semanaPasadaData = (semanaPasadaRes.data ?? []) as {
      estado: string;
    }[];

    // 1. Distribución acumulada y promedio
    const distribucionEstados = {
      presente: 0,
      ausente: 0,
      retardo: 0,
      justificado: 0,
      sin_registro: 0,
    };

    let presentesEnRango = 0;
    for (const a of ultimosData) {
      if (a.estado in distribucionEstados) {
        distribucionEstados[a.estado as keyof typeof distribucionEstados]++;
      }
      if (a.estado === 'presente' || a.estado === 'retardo') {
        presentesEnRango++;
      }
    }

    const promedioAsistencia =
      ultimosData.length > 0
        ? Math.round((presentesEnRango / ultimosData.length) * 100)
        : 0;

    // 2. Promedio semana pasada
    const presentesSemanaPasada = semanaPasadaData.filter((a) =>
      ['presente', 'retardo'].includes(a.estado),
    ).length;
    const promedioSemanaPasada =
      semanaPasadaData.length > 0
        ? Math.round((presentesSemanaPasada / semanaPasadaData.length) * 100)
        : 0;

    // 3. Asistencia por día
    const diasSemanaLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diasMap = new Map<
      string,
      {
        total: number;
        presentes: number;
        ausentes: number;
        retardos: number;
        justificados: number;
      }
    >();

    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      diasMap.set(key, {
        total: 0,
        presentes: 0,
        ausentes: 0,
        retardos: 0,
        justificados: 0,
      });
    }

    for (const a of ultimosData) {
      const slot = diasMap.get(a.fecha);
      if (!slot) continue;
      slot.total++;
      if (a.estado === 'presente') slot.presentes++;
      else if (a.estado === 'ausente') slot.ausentes++;
      else if (a.estado === 'retardo') slot.retardos++;
      else if (a.estado === 'justificado') slot.justificados++;
    }

    const asistenciaPorDia = Array.from(diasMap.entries()).map(
      ([fecha, counts]) => {
        const [y, m, d] = fecha.split('-').map(Number);
        const dateObj = new Date(y, (m ?? 1) - 1, d ?? 1);
        const label = diasSemanaLabels[dateObj.getDay()] ?? 'Día';
        return {
          fecha,
          label,
          ...counts,
        };
      },
    );

    // 4. Top talleres
    type TopTallerRow = {
      taller_id: string;
      estado: string;
      talleres: { nombre?: string; categoria?: string } | null;
    };
    const topTalleresRows = (topTalleresRes.data ?? []) as TopTallerRow[];
    const talleresMap = new Map<
      string,
      {
        nombre: string;
        categoria: string;
        registros: number;
        presentes: number;
      }
    >();

    for (const r of topTalleresRows) {
      const nombre = r.talleres?.nombre ?? 'Sin taller';
      const categoria = r.talleres?.categoria ?? 'OTRO';
      const existing = talleresMap.get(r.taller_id);
      const isPresent = r.estado === 'presente' || r.estado === 'retardo';

      if (existing) {
        existing.registros++;
        if (isPresent) existing.presentes++;
      } else {
        talleresMap.set(r.taller_id, {
          nombre,
          categoria,
          registros: 1,
          presentes: isPresent ? 1 : 0,
        });
      }
    }

    const topTalleres = Array.from(talleresMap.entries())
      .map(([id, v]) => ({
        id,
        nombre: v.nombre,
        categoria: v.categoria,
        registros: v.registros,
        promedio:
          v.registros > 0 ? Math.round((v.presentes / v.registros) * 100) : 0,
      }))
      .sort((a, b) => b.registros - a.registros)
      .slice(0, 5);

    // 5. Categorías
    type CategoriaRow = {
      id: string;
      nombre: string;
      categoria: string;
    };
    const talleresFull = (talleresFullRes.data ?? []) as CategoriaRow[];
    const categoriasMap = new Map<
      string,
      { nombre: string; total: number; talleres: number }
    >();

    for (const t of talleresFull) {
      const cat = t.categoria || 'OTRO';
      const regCount = talleresMap.get(t.id)?.registros ?? 0;
      const existing = categoriasMap.get(cat);
      if (existing) {
        existing.total += regCount;
        existing.talleres += 1;
      } else {
        categoriasMap.set(cat, { nombre: cat, total: regCount, talleres: 1 });
      }
    }

    const categorias = Array.from(categoriasMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    // 6. Alumnos con más faltas
    let alumnosConMasFaltas: AdminStats['alumnosConMasFaltas'] = [];
    const deudaData = (deudaRes.data ?? []) as {
      alumno_id: string | null;
      faltas_injustificadas: number | null;
    }[];

    if (deudaData.length > 0) {
      const alumnoIds = deudaData
        .map((d) => d.alumno_id)
        .filter(Boolean) as string[];

      if (alumnoIds.length > 0) {
        const { data: profiles } = await this.supabase
          .from('profiles')
          .select('id, nombre, matricula')
          .in('id', alumnoIds);

        const profilesData = (profiles ?? []) as ProfileRow[];
        const profileMap = new Map(profilesData.map((p) => [p.id, p]));

        alumnosConMasFaltas = deudaData
          .filter((d) => d.alumno_id)
          .map((d) => {
            const p = profileMap.get(d.alumno_id!);
            return {
              alumno_id: d.alumno_id!,
              nombre: p?.nombre ?? 'Desconocido',
              matricula: p?.matricula,
              faltas: Number(d.faltas_injustificadas ?? 0),
            };
          });
      }
    }

    // 7. Actividad reciente
    type ActividadRow = {
      id: string;
      fecha: string;
      hora: string | null;
      estado: string;
      profiles: { nombre?: string; matricula?: string } | null;
      talleres: { nombre?: string } | null;
    };
    const actividadRows = (actividadRes.data ?? []) as ActividadRow[];
    const actividadReciente = actividadRows.map((a) => ({
      id: a.id,
      fecha: a.fecha,
      hora: a.hora,
      estado: a.estado,
      alumno: a.profiles?.nombre ?? '—',
      matricula: a.profiles?.matricula ?? '',
      taller: a.talleres?.nombre ?? '—',
    }));

    return {
      totalSesiones: Number(totalRes.count ?? 0),
      promedioAsistencia,
      promedioSemanaPasada,
      talleresActivos: Number(talleresRes.count ?? 0),
      sesionesHoy: Number(hoyRes.count ?? 0),
      sesionesAyer: Number(ayerRes.count ?? 0),
      distribucionEstados,
      asistenciaPorDia,
      topTalleres,
      categorias,
      alumnosConMasFaltas,
      actividadReciente,
    };
  }

  async getAsistenciasReport(
    query: ReportesAsistenciaQueryDto,
  ): Promise<{ data?: AsistenciaReportRecord[]; csv?: string }> {
    let q = this.supabase
      .from('asistencias')
      .select(
        'id, fecha, hora, estado, observaciones, alumno_id, taller_id, profiles(id, nombre, matricula), talleres(id, nombre, categoria)',
      );

    if (query.fecha_inicio) {
      q = q.gte('fecha', query.fecha_inicio);
    }
    if (query.fecha_fin) {
      q = q.lte('fecha', query.fecha_fin);
    }
    if (query.taller_id) {
      q = q.eq('taller_id', query.taller_id);
    }

    const { data, error } = await q
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (error) {
      this.logger.error(
        `Error al obtener reporte de asistencias: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Error al obtener asistencias: ${error.message}`,
      );
    }

    const rawRecords = (data ?? []) as unknown as AsistenciaRawRow[];
    const records: AsistenciaReportRecord[] = rawRecords.map((r) => {
      const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const taller = Array.isArray(r.talleres) ? r.talleres[0] : r.talleres;
      return {
        id: r.id,
        fecha: r.fecha,
        hora: r.hora,
        estado: r.estado,
        observaciones: r.observaciones,
        alumno_id: r.alumno_id,
        taller_id: r.taller_id,
        profiles: profile
          ? {
              id: profile.id,
              nombre: profile.nombre,
              matricula: profile.matricula,
            }
          : null,
        talleres: taller
          ? {
              id: taller.id,
              nombre: taller.nombre,
              categoria: taller.categoria,
            }
          : null,
      };
    });

    if (query.formato === 'csv') {
      const headers = [
        'Fecha',
        'Alumno',
        'Matrícula',
        'Taller',
        'Estado',
        'Hora',
      ];
      const escapeCsv = (val: string | null | undefined): string => {
        if (!val) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = records.map((r) => [
        escapeCsv(r.fecha),
        escapeCsv(r.profiles?.nombre),
        escapeCsv(r.profiles?.matricula),
        escapeCsv(r.talleres?.nombre),
        escapeCsv(r.estado),
        escapeCsv(r.hora),
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');
      return { csv: csvContent };
    }

    return { data: records };
  }

  async getTalleresStats(
    query?: ReportesTalleresQueryDto,
  ): Promise<WorkshopStatsSummary[]> {
    let q = this.supabase.from('estadisticas_talleres').select('*');

    if (query?.categoria) {
      q = q.eq('categoria', query.categoria);
    }

    const { data, error } = await q;

    if (error) {
      this.logger.warn(
        `Error al consultar estadisticas_talleres: ${error.message}. Calculando resumen.`,
      );
      return this.computeTalleresStats(query?.categoria);
    }

    const rows = (data ?? []) as unknown as EstadisticaTallerRow[];
    return rows.map((r) => ({
      taller_id: r.taller_id,
      taller_nombre: r.taller_nombre,
      categoria: r.categoria,
      instructor: r.instructor ?? 'Sin asignar',
      alumnos_registrados: Number(r.alumnos_registrados ?? 0),
      asistencias_totales: Number(r.asistencias_totales ?? 0),
      faltas_totales: Number(r.faltas_totales ?? 0),
      sesiones_tomadas: Number(r.sesiones_tomadas ?? 0),
      porcentaje_asistencia_global: Number(r.porcentaje_asistencia_global ?? 0),
    }));
  }

  private async computeTalleresStats(
    categoria?: string,
  ): Promise<WorkshopStatsSummary[]> {
    let talleresQ = this.supabase
      .from('talleres')
      .select('id, nombre, categoria, instructor');

    if (categoria) {
      talleresQ = talleresQ.eq('categoria', categoria);
    }

    const { data: talleresData, error: tErr } = await talleresQ;
    if (tErr || !talleresData) {
      throw new InternalServerErrorException(
        `Error al consultar talleres: ${tErr?.message ?? 'desconocido'}`,
      );
    }

    const talleres = (talleresData ?? []) as unknown as TallerComputeRow[];
    const tallerIds = talleres.map((t) => t.id);
    if (tallerIds.length === 0) return [];

    const { data: inscripcionesData } = await this.supabase
      .from('inscripciones')
      .select('taller_id, alumno_id')
      .in('taller_id', tallerIds);

    const { data: asistenciasData } = await this.supabase
      .from('asistencias')
      .select('taller_id, fecha, estado')
      .in('taller_id', tallerIds);

    const inscripciones = (inscripcionesData ??
      []) as unknown as InscripcionComputeRow[];
    const asistencias = (asistenciasData ??
      []) as unknown as AsistenciaComputeRow[];

    const inscritosMap = new Map<string, Set<string>>();
    for (const ins of inscripciones) {
      if (!inscritosMap.has(ins.taller_id)) {
        inscritosMap.set(ins.taller_id, new Set());
      }
      inscritosMap.get(ins.taller_id)!.add(ins.alumno_id);
    }

    type AsistStats = {
      presentes: number;
      faltas: number;
      fechas: Set<string>;
      total: number;
    };
    const asistMap = new Map<string, AsistStats>();

    for (const a of asistencias) {
      let stat = asistMap.get(a.taller_id);
      if (!stat) {
        stat = { presentes: 0, faltas: 0, fechas: new Set(), total: 0 };
        asistMap.set(a.taller_id, stat);
      }
      stat.total++;
      if (a.fecha) stat.fechas.add(a.fecha);
      if (a.estado === 'presente' || a.estado === 'retardo') stat.presentes++;
      else if (a.estado === 'ausente') stat.faltas++;
    }

    return talleres.map((t) => {
      const alumnosCount = inscritosMap.get(t.id)?.size ?? 0;
      const stat = asistMap.get(t.id) ?? {
        presentes: 0,
        faltas: 0,
        fechas: new Set(),
        total: 0,
      };
      const porcentaje =
        stat.total > 0
          ? Math.round((stat.presentes / stat.total) * 1000) / 10
          : 0;

      return {
        taller_id: t.id,
        taller_nombre: t.nombre,
        categoria: t.categoria,
        instructor: t.instructor ?? 'Sin asignar',
        alumnos_registrados: alumnosCount,
        asistencias_totales: stat.presentes,
        faltas_totales: stat.faltas,
        sesiones_tomadas: stat.fechas.size,
        porcentaje_asistencia_global: porcentaje,
      };
    });
  }
}
