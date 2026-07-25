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

const ESTADO_LABELS: Record<EstadoAsistencia, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  retardo: 'Retardo',
  justificado: 'Justificado',
  sin_registro: 'Sin registro',
};

const ESTADO_COLORS: Record<EstadoAsistencia, [number, number, number]> = {
  presente: [16, 185, 129],
  ausente: [210, 74, 107],
  retardo: [244, 215, 142],
  justificado: [148, 163, 184],
  sin_registro: [120, 120, 120],
};

function formatFechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTurno(turno: string): string {
  const t = turno.toLowerCase();
  if (t.includes('mat')) return 'Matutino';
  if (t.includes('vesp')) return 'Vespertino';
  return turno.charAt(0).toUpperCase() + turno.slice(1);
}

export async function exportarPDFInstructor(
  alumnos: AlumnoConAsistencia[],
  tallerNombre: string,
  fecha: string
) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = (autoTableModule as { default?: unknown }).default ?? autoTableModule;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const presentes = alumnos.filter(a => a.estado === 'presente').length;
  const ausentes = alumnos.filter(a => a.estado === 'ausente').length;
  const retardos = alumnos.filter(a => a.estado === 'retardo').length;
  const justificados = alumnos.filter(a => a.estado === 'justificado').length;
  const sinRegistro = alumnos.filter(a => a.estado === 'sin_registro').length;
  const turno = alumnos[0]?.turno ? formatTurno(alumnos[0].turno) : '—';

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Lista de Asistencia', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(tallerNombre, 14, 22);
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, pageWidth - 14, 22, { align: 'right' });

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Fecha:', 14, 42);
  doc.setFont('helvetica', 'normal');
  doc.text(formatFechaLarga(fecha), 35, 42);
  doc.setFont('helvetica', 'bold');
  doc.text('Turno:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(turno, 35, 48);
  doc.setFont('helvetica', 'bold');
  doc.text('Total alumnos:', 14, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(String(alumnos.length), 45, 54);

  const headers: [string, string, string, string, string, string] = [
    '#', 'Alumno', 'Matrícula', 'Taller', 'Estado', 'Turno',
  ];

  const body = alumnos.map((a, i) => [
    String(i + 1),
    a.nombre,
    a.matricula,
    tallerNombre,
    ESTADO_LABELS[a.estado] ?? a.estado,
    formatTurno(a.turno),
  ]);

  (autoTable as (opts: unknown) => void)(doc, {
    startY: 62,
    head: [headers],
    body,
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'left' },
      4: { halign: 'center' },
      5: { halign: 'center', cellWidth: 22 },
    },
    didParseCell: (data: { section: string; column: { index: number }; cell: { raw?: unknown; styles: { textColor?: unknown; fontStyle?: string } } }) => {
      if (data.section === 'body' && data.column.index === 4) {
        const estadoKey = (Object.keys(ESTADO_LABELS) as EstadoAsistencia[]).find(
          k => ESTADO_LABELS[k] === data.cell.raw
        );
        if (estadoKey) {
          const [r, g, b] = ESTADO_COLORS[estadoKey];
          data.cell.styles.textColor = [r, g, b];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 62;
  let summaryY = finalY + 8;
  const pageHeight = doc.internal.pageSize.getHeight();
  if (summaryY + 28 > pageHeight - 15) { summaryY = pageHeight - 43; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Resumen', 14, summaryY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const summary: [string, number, [number, number, number]][] = [
    ['Presentes', presentes, ESTADO_COLORS.presente],
    ['Ausentes', ausentes, ESTADO_COLORS.ausente],
    ['Retardos', retardos, ESTADO_COLORS.retardo],
    ['Justificados', justificados, ESTADO_COLORS.justificado],
    ['Sin registro', sinRegistro, ESTADO_COLORS.sin_registro],
  ];
  const cellW = (pageWidth - 28) / summary.length;
  summary.forEach(([label, value, color], i) => {
    const x = 14 + i * cellW;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, summaryY + 4, cellW - 3, 18, 2, 2, 'FD');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(value), x + (cellW - 3) / 2, summaryY + 12, { align: 'center' });
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label, x + (cellW - 3) / 2, summaryY + 18, { align: 'center' });
  });

  const totalPages = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - 14,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'right' }
    );
  }

  const filename = `asistencia_${tallerNombre.replace(/\s+/g, '_')}_${fecha}.pdf`;
  doc.save(filename);
}
