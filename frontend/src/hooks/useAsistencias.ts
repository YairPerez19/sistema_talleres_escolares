import * as React from 'react';
import { supabase } from '../integrations/supabase/client';
import type { AlumnoConAsistencia, EstadoAsistencia, FiltroAsistencia, Asistencia } from '../lib/types';
import { toast } from 'sonner';

interface AsistenciaConRelaciones extends Asistencia {
  profiles: { nombre: string; matricula: string; turno: string } | null;
  talleres: { nombre: string; categoria: string; instructor: string } | null;
}

export interface AdminStats {
  totalSesiones: number;
  promedioAsistencia: number;
  alumnosConMasFaltas: { alumno_id: string; nombre: string; matricula?: string; faltas: number }[];
  talleresActivos: number;
  sesionesHoy: number;
  sesionesAyer: number;
  promedioSemanaPasada: number;
  distribucionEstados: Record<EstadoAsistencia, number>;
  asistenciaPorDia: { fecha: string; label: string; total: number; presentes: number; ausentes: number; retardos: number; justificados: number }[];
  topTalleres: { id: string; nombre: string; categoria: string; registros: number; promedio: number }[];
  categorias: { nombre: string; total: number; talleres: number }[];
  actividadReciente: {
    id: string;
    fecha: string;
    hora: string | null;
    estado: EstadoAsistencia;
    alumno: string;
    matricula: string;
    taller: string;
  }[];
}

export function useAsistencias(tallerId: string | undefined, fecha: string) {
  const [alumnos, setAlumnos] = React.useState<AlumnoConAsistencia[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState<Set<string>>(new Set());
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);

  const fetchAlumnos = React.useCallback(async () => {
    if (!tallerId) { 
      console.log('[useAsistencias] No hay tallerId seleccionado');
      setAlumnos([]); 
      setLoading(false); 
      return; 
    }

    setLoading(true);
    console.log('[useAsistencias] Llamando RPC get_asistencia_taller para:', tallerId, 'fecha:', fecha);
    
    const { data, error } = await (supabase
      .rpc('get_asistencia_taller', { p_taller_id: tallerId, p_fecha: fecha }) as ReturnType<typeof supabase.rpc>);

    if (error) {
      console.error('[useAsistencias] Error en RPC:', error);
      toast.error('Error al cargar alumnos: ' + error.message);
    } else {
      console.log('[useAsistencias] Alumnos recibidos:', (data as unknown[])?.length);
      setAlumnos((data ?? []) as unknown as AlumnoConAsistencia[]);
    }
    setLoading(false);
  }, [tallerId, fecha]);

  React.useEffect(() => {
    fetchAlumnos();
  }, [fetchAlumnos]);

  React.useEffect(() => {
    if (!tallerId) return;

    const channel = supabase
      .channel(`asistencias:${tallerId}:${fecha}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'asistencias',
          filter: `taller_id=eq.${tallerId}`,
        },
        () => {
          console.log('[useAsistencias] Cambio detectado en realtime, recargando...');
          fetchAlumnos();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tallerId, fecha, fetchAlumnos]);

  const registrarAsistencia = React.useCallback(async (
    alumnoId: string,
    estado: EstadoAsistencia,
    observaciones?: string
  ) => {
    if (!tallerId) return;

    setAlumnos(prev => prev.map(a =>
      a.alumno_id === alumnoId
        ? { ...a, estado, observaciones: observaciones ?? a.observaciones }
        : a
    ));
    setSaving(prev => new Set(prev).add(alumnoId));

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await (supabase
      .from('asistencias')
      .upsert(
        {
          alumno_id: alumnoId,
          taller_id: tallerId,
          instructor_id: user?.id ?? null,
          fecha,
          hora: new Date().toTimeString().slice(0, 8),
          estado,
          observaciones: observaciones ?? null,
        },
        { onConflict: 'alumno_id,taller_id,fecha' }
      ) as unknown as { error: Error | null });

    setSaving(prev => {
      const next = new Set(prev);
      next.delete(alumnoId);
      return next;
    });

    if (error) {
      console.error('[useAsistencias] Error al guardar:', error);
      toast.error('Error al guardar asistencia: ' + error.message);
      fetchAlumnos();
    } else {
      setLastSaved(new Date());
    }
  }, [tallerId, fecha, fetchAlumnos]);

  return {
    alumnos,
    loading,
    isSaving: saving.size > 0,
    saving,
    lastSaved,
    registrarAsistencia,
    refresh: fetchAlumnos,
  };
}

export function useAsistenciasAdmin(filtro: FiltroAsistencia) {
  const [asistencias, setAsistencias] = React.useState<AsistenciaConRelaciones[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  React.useEffect(() => {
    async function fetchAsistencias() {
      setLoading(true);

      let query = supabase
        .from('asistencias')
        .select(`
          *,
          profiles!asistencias_alumno_id_fkey(nombre, matricula, turno),
          talleres!asistencias_taller_id_fkey(nombre, categoria, instructor)
        `)
        .order('fecha', { ascending: false })
        .limit(500);

      if (filtro.fecha) query = query.eq('fecha', filtro.fecha);
      if (filtro.taller_id) query = query.eq('taller_id', filtro.taller_id);
      if (filtro.estado) query = query.eq('estado', filtro.estado);

      const { data } = await query;
      setAsistencias((data ?? []) as unknown as AsistenciaConRelaciones[]);
      setLoading(false);
    }

    fetchAsistencias();
  }, [filtro.fecha, filtro.taller_id, filtro.estado, refreshKey]);

  React.useEffect(() => {
    const channel = supabase
      .channel('admin:asistencias:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asistencias' },
        () => { refresh(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { asistencias, loading, refresh };
}

export function useEstadisticasAdmin() {
  const [stats, setStats] = React.useState<AdminStats>({
    totalSesiones: 0,
    promedioAsistencia: 0,
    alumnosConMasFaltas: [],
    talleresActivos: 0,
    sesionesHoy: 0,
    sesionesAyer: 0,
    promedioSemanaPasada: 0,
    distribucionEstados: { presente: 0, ausente: 0, retardo: 0, justificado: 0, sin_registro: 0 },
    asistenciaPorDia: [],
    topTalleres: [],
    categorias: [],
    actividadReciente: [],
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refresh = React.useCallback(() => setRefreshKey(k => k + 1), []);

  React.useEffect(() => {
    async function fetchStats() {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const hace7 = new Date(today);
      hace7.setDate(today.getDate() - 6);
      const hace7Str = hace7.toISOString().split('T')[0];

      const hace14 = new Date(today);
      hace14.setDate(today.getDate() - 13);
      const hace14Str = hace14.toISOString().split('T')[0];

      const [
        totalRes,
        hoyRes,
        ayerRes,
        talleresRes,
        deudaRes,
        ultimos7Res,
        semanaPasadaRes,
        topTalleresRes,
        actividadRes,
        talleresFullRes,
      ] = await Promise.all([
        supabase.from('asistencias').select('*', { count: 'exact', head: true }),
        supabase.from('asistencias').select('*', { count: 'exact', head: true }).eq('fecha', todayStr),
        supabase.from('asistencias').select('*', { count: 'exact', head: true }).eq('fecha', yesterdayStr),
        supabase.from('talleres').select('*', { count: 'exact', head: true }),
        supabase.from('deuda_alumnos')
          .select('alumno_id, faltas_injustificadas')
          .order('faltas_injustificadas', { ascending: false })
          .limit(5),
        supabase
          .from('asistencias')
          .select('fecha, estado')
          .gte('fecha', hace7Str)
          .lte('fecha', todayStr),
        supabase
          .from('asistencias')
          .select('estado')
          .gte('fecha', hace14Str)
          .lt('fecha', hace7Str),
        supabase
          .from('asistencias')
          .select('taller_id, estado, talleres!asistencias_taller_id_fkey(nombre, categoria)')
          .gte('fecha', hace7Str)
          .lte('fecha', todayStr)
          .limit(2000),
        supabase
          .from('asistencias')
          .select(`
            id, fecha, hora, estado,
            profiles!asistencias_alumno_id_fkey(nombre, matricula),
            talleres!asistencias_taller_id_fkey(nombre)
          `)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase.from('talleres').select('id, nombre, categoria, horarios(id, dia)'),
      ]);

      const ultimos7Data = (ultimos7Res.data ?? []) as { fecha: string; estado: string }[];

      const distribucionAcumulada: Record<EstadoAsistencia, number> = {
        presente: 0, ausente: 0, retardo: 0, justificado: 0, sin_registro: 0,
      };
      const totalAsistencias = ultimos7Data.length;
      const presentesEn7 = ultimos7Data.filter(a => ['presente', 'retardo'].includes(a.estado)).length;
      const promedio = totalAsistencias > 0 ? Math.round((presentesEn7 / totalAsistencias) * 100) : 0;

      ultimos7Data.forEach(a => {
        const estado = a.estado as EstadoAsistencia;
        if (estado in distribucionAcumulada) distribucionAcumulada[estado] += 1;
      });

      const diasMap = new Map<string, { total: number; presentes: number; ausentes: number; retardos: number; justificados: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
        diasMap.set(key, { total: 0, presentes: 0, ausentes: 0, retardos: 0, justificados: 0 });
        void label;
      }
      ultimos7Data.forEach(a => {
        const slot = diasMap.get(a.fecha);
        if (!slot) return;
        slot.total += 1;
        if (a.estado === 'presente') slot.presentes += 1;
        else if (a.estado === 'ausente') slot.ausentes += 1;
        else if (a.estado === 'retardo') slot.retardos += 1;
        else if (a.estado === 'justificado') slot.justificados += 1;
      });
      const asistenciaPorDia = Array.from(diasMap.entries()).map(([fecha, v]) => {
        const d = new Date(fecha + 'T00:00:00');
        const label = d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', '');
        return {
          fecha,
          label: label.charAt(0).toUpperCase() + label.slice(1),
          ...v,
        };
      });

      const semanaPasadaData = (semanaPasadaRes.data ?? []) as { estado: string }[];
      const totalSemanaPasada = semanaPasadaData.length;
      const presentesSemanaPasada = semanaPasadaData.filter(a => ['presente', 'retardo'].includes(a.estado)).length;
      const promedioSemanaPasada = totalSemanaPasada > 0
        ? Math.round((presentesSemanaPasada / totalSemanaPasada) * 100)
        : 0;

      type TallerRow = {
        taller_id: string;
        estado: string;
        talleres: { nombre: string; categoria: string } | null;
      };
      const talleresMap = new Map<string, { nombre: string; categoria: string; registros: number; presentes: number }>();
      ((topTalleresRes.data ?? []) as TallerRow[]).forEach(r => {
        const nombre = r.talleres?.nombre ?? 'Sin taller';
        const categoria = r.talleres?.categoria ?? 'OTRO';
        const existing = talleresMap.get(r.taller_id);
        if (existing) {
          existing.registros += 1;
          if (['presente', 'retardo'].includes(r.estado)) existing.presentes += 1;
        } else {
          talleresMap.set(r.taller_id, {
            nombre,
            categoria,
            registros: 1,
            presentes: ['presente', 'retardo'].includes(r.estado) ? 1 : 0,
          });
        }
      });
      const topTalleres = Array.from(talleresMap.entries())
        .map(([id, v]) => ({
          id,
          nombre: v.nombre,
          categoria: v.categoria,
          registros: v.registros,
          promedio: v.registros > 0 ? Math.round((v.presentes / v.registros) * 100) : 0,
        }))
        .sort((a, b) => b.registros - a.registros)
        .slice(0, 5);

      type CategoriaRow = { id: string; nombre: string; categoria: string; horarios: { id: string }[] | null };
      const categoriasMap = new Map<string, { nombre: string; total: number; talleres: number }>();
      ((talleresFullRes.data ?? []) as CategoriaRow[]).forEach(t => {
        const cat = t.categoria || 'OTRO';
        const regCount = (talleresMap.get(t.id)?.registros) ?? 0;
        const existing = categoriasMap.get(cat);
        if (existing) {
          existing.total += regCount;
          existing.talleres += 1;
        } else {
          categoriasMap.set(cat, { nombre: cat, total: regCount, talleres: 1 });
        }
      });
      const categorias = Array.from(categoriasMap.values()).sort((a, b) => b.total - a.total);

      const deudaData = (deudaRes.data ?? []) as { alumno_id: string | null; faltas_injustificadas: number | null }[];
      let alumnosConMasFaltas: AdminStats['alumnosConMasFaltas'] = [];
      if (deudaData.length > 0) {
        const alumnoIds = deudaData.map(d => d.alumno_id).filter(Boolean) as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nombre, matricula')
          .in('id', alumnoIds);

        const profilesData = (profiles ?? []) as { id: string; nombre: string; matricula: string }[];
        const profileMap = new Map(profilesData.map(p => [p.id, p]));
        alumnosConMasFaltas = deudaData
          .filter(d => d.alumno_id)
          .map(d => {
            const p = profileMap.get(d.alumno_id!);
            return {
              alumno_id: d.alumno_id!,
              nombre: p?.nombre ?? 'Desconocido',
              matricula: p?.matricula,
              faltas: d.faltas_injustificadas ?? 0,
            };
          });
      }

      type ActividadRow = {
        id: string;
        fecha: string;
        hora: string | null;
        estado: EstadoAsistencia;
        profiles: { nombre: string; matricula: string } | null;
        talleres: { nombre: string } | null;
      };
      const actividadReciente = ((actividadRes.data ?? []) as ActividadRow[]).map(a => ({
        id: a.id,
        fecha: a.fecha,
        hora: a.hora,
        estado: a.estado,
        alumno: a.profiles?.nombre ?? '—',
        matricula: a.profiles?.matricula ?? '',
        taller: a.talleres?.nombre ?? '—',
      }));

      setStats({
        totalSesiones: totalRes.count ?? 0,
        promedioAsistencia: promedio,
        alumnosConMasFaltas,
        talleresActivos: talleresRes.count ?? 0,
        sesionesHoy: hoyRes.count ?? 0,
        sesionesAyer: ayerRes.count ?? 0,
        promedioSemanaPasada,
        distribucionEstados: distribucionAcumulada,
        asistenciaPorDia,
        topTalleres,
        categorias,
        actividadReciente,
      });
      setLoading(false);
    }

    fetchStats();
  }, [refreshKey]);

  React.useEffect(() => {
    const channel = supabase
      .channel('admin:stats:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'asistencias' },
        () => { refresh(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  return { stats, loading, refresh };
}

export function exportarCSV(asistencias: AsistenciaConRelaciones[]) {
  const headers = ['Fecha', 'Alumno', 'Matrícula', 'Taller', 'Estado', 'Hora'];
  const rows = asistencias.map(a => [
    a.fecha, a.profiles?.nombre ?? '', a.profiles?.matricula ?? '', a.talleres?.nombre ?? '', a.estado, a.hora ?? ''
  ]);
  generateCSVDownload(rows, headers, 'reporte_asistencia.csv');
}

export function exportarCSVInstructor(
  alumnos: AlumnoConAsistencia[],
  tallerNombre: string,
  fecha: string
) {
  const headers = ['Fecha', 'Alumno', 'Matrícula', 'Taller', 'Estado', 'Turno'];
  const rows = alumnos.map(a => [
    fecha, a.nombre, a.matricula, tallerNombre, a.estado, a.turno
  ]);
  generateCSVDownload(rows, headers, `asistencia_${tallerNombre.replace(/\s+/g, '_')}_${fecha}.csv`);
}

function generateCSVDownload(rows: string[][], headers: string[], filename: string) {
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}
