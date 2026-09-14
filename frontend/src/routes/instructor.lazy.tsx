import { createLazyFileRoute } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { useInstructorTalleres } from '../hooks/useInstructor'
import { Header } from '../components/Header'
import { ListaAsistencia } from '../components/asistencia/ListaAsistencia'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { cn } from '../lib/utils'
import { supabase } from '../integrations/supabase/client'
import type { TallerConInstructor } from '../lib/types'
import { usePageMeta } from '../hooks/usePageMeta'
import { toast } from 'sonner'
import { Clock, Loader2 } from '@/components/AnimatedIcons'
import {
  MapPin, ChevronRight, ArrowLeft,
  BookOpen, Wifi, Info, Users, GraduationCap,
  FileDown, ArrowUpDown, TrendingUp, CalendarDays,
  BarChart3, ClipboardList
} from '@/components/icons'

export const Route = createLazyFileRoute('/instructor')({
  component: InstructorDashboard,
})

interface AlumnoStatsRow {
  alumno_id: string
  nombre: string
  matricula: string
  turno: string
  sesiones_asistidas: number
  faltas_injustificadas: number
  faltas_justificadas: number
  retardos: number
  total_sesiones: number
  porcentaje_asistencia: number
}

interface DayTallerDetail {
  taller_id: string
  nombre: string
  presentes: number
  ausentes: number
  retardos: number
  total: number
}

function useInstructorResumen(instructorId: string | undefined, talleres: TallerConInstructor[]) {
  const [asistencia7Dias, setAsistencia7Dias] = useState(0)
  const [totalRegistros7Dias, setTotalRegistros7Dias] = useState(0)
  const [diasConRegistro, setDiasConRegistro] = useState<Set<string>>(new Set())
  const [semana, setSemana] = useState<{ label: string; fecha: string; dia: number; esHoy: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const todayStr = today.toISOString().split('T')[0]
    const weekDays = []
    for (let i = 0; i < 6; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      weekDays.push({
        label: labels[i],
        fecha: d.toISOString().split('T')[0],
        dia: d.getDate(),
        esHoy: d.toISOString().split('T')[0] === todayStr,
      })
    }
    setSemana(weekDays)
  }, [])

  const tallerIds = talleres.map(t => t.id)
  const tallerIdsKey = tallerIds.join(',')

  useEffect(() => {
    if (!instructorId || tallerIds.length === 0) {
      setLoading(false)
      return
    }

    async function fetchData() {
      setLoading(true)
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      const hace7 = new Date(today)
      hace7.setDate(today.getDate() - 6)
      const hace7Str = hace7.toISOString().split('T')[0]

      const dayOfWeek = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      const saturday = new Date(monday)
      saturday.setDate(monday.getDate() + 5)
      const mondayStr = monday.toISOString().split('T')[0]
      const saturdayStr = saturday.toISOString().split('T')[0]

      const [statsRes, weekRes] = await Promise.all([
        supabase
          .from('asistencias')
          .select('estado')
          .in('taller_id', tallerIds)
          .gte('fecha', hace7Str)
          .lte('fecha', todayStr),
        supabase
          .from('asistencias')
          .select('fecha')
          .in('taller_id', tallerIds)
          .gte('fecha', mondayStr)
          .lte('fecha', saturdayStr),
      ])

      const statsData = (statsRes.data ?? []) as { estado: string }[]
      const total = statsData.length
      const presentes = statsData.filter(a => ['presente', 'retardo'].includes(a.estado)).length
      setAsistencia7Dias(total > 0 ? Math.round((presentes / total) * 100) : 0)
      setTotalRegistros7Dias(total)

      const weekData = (weekRes.data ?? []) as { fecha: string }[]
      setDiasConRegistro(new Set(weekData.map(a => a.fecha)))
      setLoading(false)
    }

    fetchData()
  }, [instructorId, tallerIdsKey])

  return { asistencia7Dias, totalRegistros7Dias, diasConRegistro, semana, loading }
}

function useAlumnosTaller(tallerId: string | null) {
  const [alumnos, setAlumnos] = useState<AlumnoStatsRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlumnos = useCallback(async () => {
    if (!tallerId) {
      setAlumnos([])
      setLoading(false)
      return
    }

    setLoading(true)

    const inscripcionesRes = await (supabase
      .from('inscripciones')
      .select('alumno_id')
      .eq('taller_id', tallerId) as unknown as { data: { alumno_id: string }[] | null; error: Error | null })

    const alumnoIds = (inscripcionesRes.data ?? []).map(i => i.alumno_id)

    if (alumnoIds.length === 0) {
      setAlumnos([])
      setLoading(false)
      return
    }

    const [profilesRes, deudaRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, nombre, matricula, turno')
        .in('id', alumnoIds),
      supabase
        .from('deuda_alumnos')
        .select('alumno_id, sesiones_asistidas, faltas_injustificadas, faltas_justificadas, retardos, total_sesiones, porcentaje_asistencia')
        .in('alumno_id', alumnoIds),
    ])

    const profiles = (profilesRes.data ?? []) as { id: string; nombre: string; matricula: string; turno: string }[]
    const deuda = (deudaRes.data ?? []) as {
      alumno_id: string
      sesiones_asistidas: number | null
      faltas_injustificadas: number | null
      faltas_justificadas: number | null
      retardos: number | null
      total_sesiones: number | null
      porcentaje_asistencia: number | null
    }[]

    const deudaMap = new Map(deuda.map(d => [d.alumno_id, d]))

    const alumnosStats: AlumnoStatsRow[] = profiles.map(p => {
      const d = deudaMap.get(p.id)
      return {
        alumno_id: p.id,
        nombre: p.nombre,
        matricula: p.matricula,
        turno: p.turno,
        sesiones_asistidas: d?.sesiones_asistidas ?? 0,
        faltas_injustificadas: d?.faltas_injustificadas ?? 0,
        faltas_justificadas: d?.faltas_justificadas ?? 0,
        retardos: d?.retardos ?? 0,
        total_sesiones: d?.total_sesiones ?? 0,
        porcentaje_asistencia: d?.porcentaje_asistencia ?? 0,
      }
    })

    setAlumnos(alumnosStats)
    setLoading(false)
  }, [tallerId])

  useEffect(() => {
    fetchAlumnos()
  }, [fetchAlumnos])

  return { alumnos, loading, refresh: fetchAlumnos }
}

function useDayDetail(selectedDay: string | null, tallerIds: string[]) {
  const [data, setData] = useState<DayTallerDetail[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!selectedDay || tallerIds.length === 0) {
      setData([])
      return
    }

    async function fetch() {
      setLoading(true)
      const day = selectedDay!
      const { data: raw } = await (supabase
        .from('asistencias')
        .select('taller_id, estado, talleres!asistencias_taller_id_fkey(nombre)')
        .eq('fecha', day)
        .in('taller_id', tallerIds) as unknown as { data: unknown[] | null; error: Error | null })

      const rows = (raw ?? []) as { taller_id: string; estado: string; talleres: { nombre: string } | null }[]
      const grouped = new Map<string, DayTallerDetail>()
      for (const row of rows) {
        const existing = grouped.get(row.taller_id) ?? {
          taller_id: row.taller_id,
          nombre: row.talleres?.nombre ?? 'Taller',
          presentes: 0,
          ausentes: 0,
          retardos: 0,
          total: 0,
        }
        existing.total++
        if (row.estado === 'presente') existing.presentes++
        else if (row.estado === 'ausente') existing.ausentes++
        else if (row.estado === 'retardo') existing.retardos++
        grouped.set(row.taller_id, existing)
      }

      setData(Array.from(grouped.values()))
      setLoading(false)
    }

    fetch()
  }, [selectedDay, tallerIds.join(',')])

  return { data, loading }
}

function InstructorDashboard() {
  usePageMeta({
    title: 'Panel Instructor',
    description: 'Panel de instructor del Sistema Integral de Talleres Escolares. Gestiona la asistencia de tus alumnos en el CBTis No. 61.',
    canonicalPath: '/instructor',
    noindex: true,
  })
  const { user } = useAuth()
  const { loading: roleLoading } = useRole(user?.id)
  const { talleres, loading: talleresLoading } = useInstructorTalleres(user?.id)
  const [selectedTaller, setSelectedTaller] = useState<TallerConInstructor | null>(null)
  const [activeTab, setActiveTab] = useState<'asistencia' | 'alumnos'>('asistencia')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const totalAlumnos = talleres.reduce((acc, t) => acc + (t.alumnos_count ?? 0), 0)
  const tallerIds = useMemo(() => talleres.map(t => t.id), [talleres])

  const {
    asistencia7Dias,
    totalRegistros7Dias,
    diasConRegistro,
    semana,
    loading: resumenLoading,
  } = useInstructorResumen(user?.id, talleres)

  const { data: dayDetailData, loading: dayDetailLoading } = useDayDetail(selectedDay, tallerIds)

  if (!user && !roleLoading) {
    return <div className="pt-32 px-10 text-center">Inicia sesión para ver tu panel</div>
  }

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary-glow" size={32} />
      </div>
    )
  }

  const hoy = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const handleExportMonthly = async () => {
    const ids = selectedTaller ? [selectedTaller.id] : tallerIds
    if (ids.length === 0) {
      toast.info('No hay talleres para exportar')
      return
    }

    const [year, month] = selectedMonth.split('-').map(Number)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year!, month!, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data } = await supabase
      .from('asistencias')
      .select(`
        fecha, estado, hora,
        profiles!asistencias_alumno_id_fkey(nombre, matricula),
        talleres!asistencias_taller_id_fkey(nombre)
      `)
      .in('taller_id', ids)
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .order('fecha', { ascending: true })

    const rows = (data ?? []) as {
      fecha: string
      estado: string
      hora: string | null
      profiles: { nombre: string; matricula: string } | null
      talleres: { nombre: string } | null
    }[]

    if (rows.length === 0) {
      toast.info('No hay registros para este mes')
      return
    }

    const headers = ['Fecha', 'Alumno', 'Matrícula', 'Taller', 'Estado', 'Hora']
    const csvRows = rows.map(r => [
      r.fecha,
      r.profiles?.nombre ?? '',
      r.profiles?.matricula ?? '',
      r.talleres?.nombre ?? '',
      r.estado,
      r.hora ?? '',
    ])
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const label = selectedTaller
      ? selectedTaller.nombre.replace(/\s+/g, '_')
      : 'todos_los_talleres'
    link.download = `reporte_${label}_${selectedMonth}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Reporte mensual exportado')
  }

  const handleDayClick = (fecha: string) => {
    setSelectedDay(prev => prev === fecha ? null : fecha)
  }

  return (
    <div className="flex flex-col pt-4 pb-20 w-full">
      <div className="bg-[#0a0205]/60 backdrop-blur-[24px] border border-white/[0.04] mb-8 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto shadow-lg shadow-black/20">
        <Header />
        <div className="pt-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#8B1A32]/70 mb-2 block">
              Panel de Control
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">
              {selectedTaller ? selectedTaller.nombre : 'Mis Talleres'}
            </h1>
            <p className="text-white/40 text-sm mt-1 capitalize">{hoy}</p>
          </div>

          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl self-start">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            <Wifi size={14} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs font-bold">Tiempo Real</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto w-full px-4 md:px-0">
        {!selectedTaller && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!resumenLoading && talleres.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="glass-card rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Users size={18} className="text-primary-glow" />
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Alumnos</span>
                    </div>
                    <p className="text-3xl font-black text-white">{totalAlumnos}</p>
                    <p className="text-[10px] text-white/20 mt-1">Inscritos en todos los talleres</p>
                  </div>

                  <div className="glass-card rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <BookOpen size={18} className="text-primary-glow" />
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Talleres</span>
                    </div>
                    <p className="text-3xl font-black text-white">{talleres.length}</p>
                    <p className="text-[10px] text-white/20 mt-1">Asignados a tu cuenta</p>
                  </div>

                  <div className="glass-card rounded-2xl p-5 border border-emerald-500/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <TrendingUp size={18} className="text-emerald-400" />
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Asistencia</span>
                    </div>
                    <p className="text-3xl font-black text-emerald-400">{asistencia7Dias}%</p>
                    <p className="text-[10px] text-white/20 mt-1">Promedio últimos 7 días</p>
                  </div>

                  <div className="glass-card rounded-2xl p-5 border border-white/5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <BarChart3 size={18} className="text-primary-glow" />
                      </div>
                      <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Registros</span>
                    </div>
                    <p className="text-3xl font-black text-white">{totalRegistros7Dias}</p>
                    <p className="text-[10px] text-white/20 mt-1">Asistencias en 7 días</p>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-white/5 mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <CalendarDays size={18} className="text-primary-glow" />
                    <span className="text-sm font-bold text-white">Calendario Semanal</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2">
                    {semana.map(day => (
                      <button
                        key={day.fecha}
                        type="button"
                        onClick={() => handleDayClick(day.fecha)}
                        className={cn(
                          'flex flex-col items-center p-3 rounded-xl transition-all border',
                          day.esHoy && !selectedDay && 'border-primary/30 bg-primary/5',
                          selectedDay === day.fecha && 'border-primary/50 bg-primary/10',
                          !day.esHoy && selectedDay !== day.fecha && 'border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                        )}
                      >
                        <span className="text-[10px] uppercase font-bold text-white/40">{day.label}</span>
                        <span className={cn('text-lg font-black', day.esHoy ? 'text-primary-glow' : 'text-white')}>{day.dia}</span>
                        <div className={cn(
                          'w-2.5 h-2.5 rounded-full mt-1 transition-all',
                          diasConRegistro.has(day.fecha)
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                            : 'bg-white/10'
                        )} />
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDay && (
                  <div className="glass-card rounded-2xl p-5 border border-white/5 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <ClipboardList size={18} className="text-primary-glow" />
                        <span className="text-sm font-bold text-white">
                          {new Date(selectedDay + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDay(null)}
                        className="text-white/30 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                    {dayDetailLoading ? (
                      <div className="space-y-2">
                        {[1, 2].map(i => <div key={i} className="h-12 rounded-xl bg-white/[0.02] animate-pulse" />)}
                      </div>
                    ) : dayDetailData.length === 0 ? (
                      <div className="text-center py-6">
                        <Info size={24} className="mx-auto mb-2 text-white/20" />
                        <p className="text-white/30 text-sm font-bold">Sin registros para este día</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayDetailData.map(t => (
                          <div key={t.taller_id} className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 gap-2">
                            <span className="text-sm font-bold text-white">{t.nombre}</span>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-emerald-400 font-bold">{t.presentes}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#d24a6b]" />
                                <span className="text-[#d24a6b] font-bold">{t.ausentes}</span>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-[#f4d78e]" />
                                <span className="text-[#f4d78e] font-bold">{t.retardos}</span>
                              </span>
                              <span className="text-white/30">{t.total} total</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-3 mb-6">
              <BookOpen size={20} className="text-primary-glow" />
              <h2 className="text-xl font-bold text-white">Listado de Talleres</h2>
            </div>

            {talleresLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl glass-card animate-pulse" />)}
              </div>
            ) : talleres.length === 0 ? (
              <div className="glass-card p-12 rounded-[2.5rem] text-center border border-dashed border-white/10">
                <Info size={40} className="mx-auto mb-4 text-primary-glow opacity-50" />
                <p className="text-white/60 font-bold uppercase tracking-widest">No hay talleres para mostrar</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {talleres.map(taller => (
                  <TallerInstructorRow
                    key={taller.id}
                    taller={taller}
                    onClick={() => {
                      setSelectedTaller(taller)
                      setActiveTab('asistencia')
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTaller && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              type="button"
              onClick={() => {
                setSelectedTaller(null)
                setSelectedDay(null)
              }}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 text-sm font-bold"
            >
              <ArrowLeft size={16} />
              Volver a la lista
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('asistencia')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border',
                    activeTab === 'asistencia'
                      ? 'bg-primary/15 text-primary-glow border-primary/30 shadow-lg shadow-primary/5'
                      : 'bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10'
                  )}
                >
                  <ClipboardList size={14} />
                  Lista de Asistencia
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('alumnos')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border',
                    activeTab === 'alumnos'
                      ? 'bg-primary/15 text-primary-glow border-primary/30 shadow-lg shadow-primary/5'
                      : 'bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10'
                  )}
                >
                  <GraduationCap size={14} />
                  Mis Alumnos
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/40 [color-scheme:dark]"
                />
                <button
                  type="button"
                  onClick={handleExportMonthly}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                >
                  <FileDown size={14} />
                  <span className="hidden md:inline">Exportar reporte mensual</span>
                  <span className="md:hidden">CSV</span>
                </button>
              </div>
            </div>

            {activeTab === 'asistencia' && (
              <div className="glass-card p-6 md:p-8 rounded-[2.5rem] animate-in fade-in duration-300">
                <ListaAsistencia
                  tallerId={selectedTaller.id}
                  tallerNombre={selectedTaller.nombre}
                  soloLectura={false}
                />
              </div>
            )}

            {activeTab === 'alumnos' && (
              <MisAlumnos tallerId={selectedTaller.id} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MisAlumnos({ tallerId }: { tallerId: string }) {
  const { alumnos, loading, refresh } = useAlumnosTaller(tallerId)
  const [sortBy, setSortBy] = useState<'nombre' | 'porcentaje'>('nombre')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const sortedAlumnos = useMemo(() => {
    return [...alumnos].sort((a, b) => {
      if (sortBy === 'nombre') {
        const cmp = a.nombre.localeCompare(b.nombre)
        return sortDir === 'asc' ? cmp : -cmp
      }
      const cmp = a.porcentaje_asistencia - b.porcentaje_asistencia
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [alumnos, sortBy, sortDir])

  const toggleSort = (field: 'nombre' | 'porcentaje') => {
    if (sortBy === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-6 md:p-8 rounded-[2.5rem] animate-in fade-in duration-300">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (alumnos.length === 0) {
    return (
      <div className="glass-card rounded-[2.5rem] p-10 text-center border border-dashed border-white/10 animate-in fade-in duration-300">
        <GraduationCap size={32} className="mx-auto mb-3 text-white/20" />
        <p className="text-white/30 font-bold uppercase tracking-widest text-sm">Sin alumnos inscritos</p>
      </div>
    )
  }

  return (
    <div className="glass-card p-6 md:p-8 rounded-[2.5rem] animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-white">Mis Alumnos</h2>
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mt-1">
            {alumnos.length} alumnos inscritos
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
        >
          <Loader2 className="animate-spin text-primary-glow" size={14} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="pb-3 pr-4">
                <button
                  type="button"
                  onClick={() => toggleSort('nombre')}
                  className={cn(
                    'flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest transition-colors',
                    sortBy === 'nombre' ? 'text-primary-glow' : 'text-white/30 hover:text-white/50'
                  )}
                >
                  Alumno
                  <ArrowUpDown size={10} />
                </button>
              </th>
              <th className="pb-3 px-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Matrícula</span>
              </th>
              <th className="pb-3 px-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Turno</span>
              </th>
              <th className="pb-3 px-3 text-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Asistencias</span>
              </th>
              <th className="pb-3 px-3 text-center">
                <span className="text-[10px] uppercase font-black tracking-widest text-white/30">Faltas</span>
              </th>
              <th className="pb-3 pl-3 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort('porcentaje')}
                  className={cn(
                    'flex items-center gap-1.5 text-[10px] uppercase font-black tracking-widest transition-colors ml-auto',
                    sortBy === 'porcentaje' ? 'text-primary-glow' : 'text-white/30 hover:text-white/50'
                  )}
                >
                  % Asist.
                  <ArrowUpDown size={10} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedAlumnos.map(alumno => (
              <tr key={alumno.alumno_id} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors">
                <td className="py-3 pr-4">
                  <span className="text-sm font-bold text-white">{alumno.nombre}</span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-xs text-white/40 font-mono">{alumno.matricula}</span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-xs text-white/40">{alumno.turno}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  <span className="text-sm font-bold text-emerald-400">{alumno.sesiones_asistidas}</span>
                  <span className="text-[10px] text-white/20 ml-1">/ {alumno.total_sesiones}</span>
                </td>
                <td className="py-3 px-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm font-bold text-[#d24a6b]">{alumno.faltas_injustificadas}</span>
                    {alumno.faltas_justificadas > 0 && (
                      <span className="text-[10px] text-white/20">+{alumno.faltas_justificadas} just.</span>
                    )}
                  </div>
                </td>
                <td className="py-3 pl-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          alumno.porcentaje_asistencia >= 80 ? 'bg-emerald-400' :
                          alumno.porcentaje_asistencia >= 60 ? 'bg-[#f4d78e]' :
                          'bg-[#d24a6b]'
                        )}
                        style={{ width: `${alumno.porcentaje_asistencia}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-sm font-black min-w-[3ch] text-right',
                      alumno.porcentaje_asistencia >= 80 ? 'text-emerald-400' :
                      alumno.porcentaje_asistencia >= 60 ? 'text-[#f4d78e]' :
                      'text-[#d24a6b]'
                    )}>
                      {alumno.porcentaje_asistencia}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TallerInstructorRow({
  taller,
  onClick,
}: {
  taller: TallerConInstructor
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'glass-card rounded-2xl p-5 text-left border border-white/5 w-full',
        'hover:border-primary/40 hover:bg-white/[0.02] transition-all duration-300',
        'group flex flex-col md:flex-row md:items-center justify-between gap-4'
      )}
    >
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary-glow border border-primary/20 shrink-0">
          <BookOpen size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-primary-glow transition-colors">
            {taller.nombre}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <div className="flex items-center gap-1.5 text-white/40 text-[11px] uppercase font-bold tracking-wider">
              <MapPin size={12} className="text-primary-glow" />
              {taller.lugar}
            </div>
            <div className="flex items-center gap-1.5 text-white/40 text-[11px] uppercase font-bold tracking-wider">
              <Clock size={12} className="text-primary-glow" />
              {taller.horarios && taller.horarios.length > 0 ? taller.horarios[0].dia : 'Sin horario'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-0 border-white/5 pt-4 md:pt-0">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-white font-black leading-none">{taller.alumnos_count}</p>
            <p className="text-[9px] text-white/30 uppercase font-bold tracking-tighter">Alumnos</p>
          </div>
          <div className="h-8 w-1 bg-white/10 rounded-full" />
          <div className="text-right">
            <p className="text-white font-black leading-none">{taller.cupo}</p>
            <p className="text-[9px] text-white/30 uppercase font-bold tracking-tighter">Cupo</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary text-white transition-all shadow-lg shadow-primary/0 group-hover:shadow-primary/20">
          <ChevronRight size={20} />
        </div>
      </div>
    </button>
  )
}
