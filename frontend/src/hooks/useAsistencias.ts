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
  alumnosConMasFaltas: { alumno_id: string; nombre: string; faltas: number }[];
  talleresActivos: number;
  sesionesHoy: number;
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
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      const today = new Date().toISOString().split('T')[0];

      const [totalRes, hoyRes, talleresRes, deudaRes] = await Promise.all([
        supabase.from('asistencias').select('*', { count: 'exact', head: true }),
        supabase.from('asistencias').select('*', { count: 'exact', head: true }).eq('fecha', today),
        supabase.from('talleres').select('*', { count: 'exact', head: true }),
        supabase.from('deuda_alumnos').select('alumno_id, faltas_injustificadas').order('faltas_injustificadas', { ascending: false }).limit(5),
      ]);

      const { data: allAsistencias } = await supabase.from('asistencias').select('estado');
      const asistenciasData = (allAsistencias ?? []) as { estado: string }[];
      const total = asistenciasData.length;
      const presentes = asistenciasData.filter(a => ['presente', 'retardo'].includes(a.estado)).length;
      const promedio = total > 0 ? Math.round((presentes / total) * 100) : 0;

      const deudaData = (deudaRes.data ?? []) as { alumno_id: string | null; faltas_injustificadas: number | null }[];
      let alumnosConMasFaltas: AdminStats['alumnosConMasFaltas'] = [];
      if (deudaData.length > 0) {
        const alumnoIds = deudaData.map(d => d.alumno_id).filter(Boolean) as string[];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nombre')
          .in('id', alumnoIds);

        const profilesData = (profiles ?? []) as { id: string; nombre: string }[];
        const nombreMap = new Map(profilesData.map(p => [p.id, p.nombre]));
        alumnosConMasFaltas = deudaData
          .filter(d => d.alumno_id)
          .map(d => ({
            alumno_id: d.alumno_id!,
            nombre: nombreMap.get(d.alumno_id!) ?? 'Desconocido',
            faltas: d.faltas_injustificadas ?? 0,
          }));
      }

      setStats({
        totalSesiones: totalRes.count ?? 0,
        promedioAsistencia: promedio,
        alumnosConMasFaltas,
        talleresActivos: talleresRes.count ?? 0,
        sesionesHoy: hoyRes.count ?? 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  return { stats, loading };
}

export function exportarCSV(asistencias: AsistenciaConRelaciones[]) {
  const headers = ['Fecha', 'Alumno', 'Matrícula', 'Taller', 'Estado', 'Hora'];
  const rows = asistencias.map(a => [
    a.fecha, a.profiles?.nombre ?? '', a.profiles?.matricula ?? '', a.talleres?.nombre ?? '', a.estado, a.hora ?? ''
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reporte_asistencia.csv';
  link.click();
}
