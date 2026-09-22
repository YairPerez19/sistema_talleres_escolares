import { createLazyFileRoute, Link } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { Header } from '../components/Header'
import { useTalleres, useInscripciones, useProfile } from '../hooks/useTalleres'
import { WeekCalendar } from '../components/WeekCalendar'
import { TallerCard } from '../components/TallerCard'
import { toast } from 'sonner'
import { supabase } from '../integrations/supabase/client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { Clock, RefreshCw } from '@/components/AnimatedIcons'
import { DollarSign, Search, ChevronDown, CalendarDays, Percent, XCircle } from '@/components/icons'
import { usePageMeta } from '../hooks/usePageMeta'
import { cn } from '../lib/utils'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { BajaDialog } from '../components/BajaDialog'
import { EstadoBadge } from '../components/asistencia/EstadoBadge'
import type { EstadoAsistencia } from '../lib/types'

export const Route = createLazyFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  usePageMeta({
    title: 'Mi Panel',
    description: 'Panel de alumno del Sistema Integral de Talleres Escolares. Consulta tus talleres inscritos, horarios y estado de cuenta.',
    canonicalPath: '/dashboard',
    noindex: true,
  })
  const { user } = useAuth();
  const { talleres, loading: talleresLoading } = useTalleres();
  const { inscritosIds, refresh: refreshInscripciones } = useInscripciones(user?.id);
  const { profile, refreshProfile, setCambios } = useProfile(user?.id);
  const [actionLoading, setActionLoading] = useState(false);
  const [deuda, setDeuda] = useState(0);
  const [costoPorSesion, setCostoPorSesion] = useState(25);
  const [asistencia, setAsistencia] = useState<{
    taller_id: string;
    taller_nombre: string;
    fecha: string;
    estado: string;
    observaciones: string | null;
    hora: string | null;
  }[]>([]);
  const [expandedTalleres, setExpandedTalleres] = useState<Record<string, boolean>>({});
  const [bajaDialogOpen, setBajaDialogOpen] = useState(false);
  const [bajaTarget, setBajaTarget] = useState<{ tallerId: string; nombre: string } | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (sidebarRef.current) {
      gsap.fromTo('.sidebar-card', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.4)', delay: 0.2 })
    }
  }, { scope: sidebarRef })

  useEffect(() => {
    if (user) {
      supabase.from('deuda_alumnos')
        .select('deuda_total')
        .eq('alumno_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            const deudaData = data as { deuda_total: number | null };
            setDeuda(deudaData.deuda_total || 0);
          }
        });

      supabase.from('settings')
        .select('value')
        .eq('key', 'costo_por_sesion')
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setCostoPorSesion(parseInt((data as { value: string }).value ?? '25'));
          }
        });

      (supabase.rpc as any)('get_mi_asistencia', { p_alumno_id: user.id })
        .then(({ data, error }: { data: unknown; error: unknown }) => {
          if (!error && data) {
            setAsistencia(data as {
              taller_id: string;
              taller_nombre: string;
              fecha: string;
              estado: string;
              observaciones: string | null;
              hora: string | null;
            }[]);
          }
        });
    }
  }, [user]);

  const openBajaDialog = (tallerId: string, nombre: string) => {
    const cambiosActuales = profile?.cambios_restantes ?? 3;
    if (cambiosActuales <= 0) {
      toast.error('No puedes darte de baja: has agotado tus 3 cambios permitidos.');
      return;
    }
    setBajaTarget({ tallerId, nombre });
    setBajaDialogOpen(true);
  };

  const handleBaja = async (_motivo: string) => {
    if (!user || !bajaTarget) return;
    const cambiosActuales = profile?.cambios_restantes ?? 3;
    const nuevosCambios = Math.max(cambiosActuales - 1, 0);

    setBajaDialogOpen(false);
    setBajaTarget(null);
    setActionLoading(true);
    setCambios(nuevosCambios);

    const { data, error } = await (supabase.rpc as any)('dar_baja_taller', {
      p_alumno_id: user.id,
      p_taller_id: bajaTarget.tallerId,
    });

    if (error || !data || !(data as { success: boolean; error?: string; taller_nombre?: string }).success) {
      const resultData = data as { success?: boolean; error?: string; taller_nombre?: string } | null;
      const errMsg = error?.message || resultData?.error || 'Error desconocido';
      toast.error('Error al dar de baja: ' + errMsg);
      setCambios(cambiosActuales);
      setActionLoading(false);
      return;
    }

    refreshInscripciones();
    refreshProfile();
    const resultData = data as { taller_nombre?: string };
    toast.success(`Dado de baja de ${resultData.taller_nombre || bajaTarget.nombre}.`);
    setActionLoading(false);
  };

  const misTalleres = talleres.filter(t => inscritosIds.has(t.id));
  const diasRestantes = profile?.inscripcion_limite 
    ? Math.max(0, Math.ceil((new Date(profile.inscripcion_limite).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const asistenciaByTaller = useMemo(() => {
    const map = new Map<string, { taller_nombre: string; records: typeof asistencia }>();
    for (const a of asistencia) {
      if (!map.has(a.taller_id)) {
        map.set(a.taller_id, { taller_nombre: a.taller_nombre, records: [] });
      }
      map.get(a.taller_id)!.records.push(a);
    }
    return map;
  }, [asistencia]);

  const asistenciaSummary = useMemo(() => {
    const total = asistencia.length;
    const presentes = asistencia.filter(a => ['presente', 'retardo'].includes(a.estado)).length;
    const ausentes = asistencia.filter(a => a.estado === 'ausente').length;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;
    return { total, presentes, ausentes, porcentaje };
  }, [asistencia]);

  const toggleTaller = (tallerId: string) => {
    setExpandedTalleres(prev => ({ ...prev, [tallerId]: !prev[tallerId] }));
  };

  if (!user && !talleresLoading) {
    return <div className="pt-32 px-10 text-center">Inicia sesión para ver tu horario</div>;
  }

  return (
    <div className="surface-page flex flex-col pt-4 pb-20 w-full">
      <div className="bg-white/90 backdrop-blur-[24px] border border-[#721422]/10 mb-10 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto shadow-[0_16px_40px_-24px_rgba(73,19,31,0.40)]">
        <Header />
        <div className="pt-6">
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#8B1A32] mb-2 block">Mi Dashboard</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#4d0e18]">Mi Horario Escolar</h1>
        </div>
      </div>

      <div className="mt-8 mb-16 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div ref={sidebarRef} className="lg:col-span-1 space-y-6">
          <div className="sidebar-card surface-panel p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B1A32]/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B1A32]/20 to-[#5C1020]/10 border border-[#8B1A32]/15 flex items-center justify-center text-[#8B1A32] mb-4">
              <DollarSign size={22} />
            </div>
            <h3 className="text-lg font-bold text-[#4d0e18] mb-3">Estado de Cuenta</h3>
            <div className="bg-[#fff7f8] rounded-2xl p-5 border border-[#721422]/10">
              <p className="text-[10px] uppercase tracking-widest text-[#9b7881] font-bold mb-1">Total a Pagar</p>
              <p className="text-3xl md:text-4xl font-extrabold text-[#351019]">${deuda.toFixed(2)}</p>
              <div className="mt-3 pt-3 border-t border-[#721422]/10 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-[#9b7881] font-bold">Costo por sesión</span>
                <span className="text-xs font-bold text-[#8B1A32]">${costoPorSesion}</span>
              </div>
            </div>
          </div>

          <div className="sidebar-card surface-panel p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B1A32]/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B1A32]/20 to-[#5C1020]/10 border border-[#8B1A32]/15 flex items-center justify-center text-[#8B1A32] mb-4">
              <RefreshCw size={22} />
            </div>
            <h3 className="text-lg font-bold text-[#4d0e18] mb-2">Cambios Disponibles</h3>
            <p className="text-[10px] text-[#9b7881] uppercase tracking-widest font-bold mb-4">Límite de 3 por ciclo</p>
            
            {!profile ? (
              <div className="flex gap-2 mb-6 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="flex-1 h-2 rounded-full bg-[#ead9dd]" />)}
              </div>
            ) : (
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${i <= (profile?.cambios_restantes ?? 0) ? 'bg-gradient-to-r from-[#8B1A32] to-[#B8354D] shadow-[0_0_10px_rgba(139,26,50,0.3)]' : 'bg-[#ead9dd]'}`}
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-[#765c64]">
              <Clock size={16} className={cn("text-[#8B1A32]", !profile && "animate-pulse")} />
              <div>
                <p className="text-xs font-bold text-[#4d2630]">
                  {!profile ? 'Calculando...' : `${diasRestantes} días restantes`}
                </p>
                <p className="text-[10px] text-[#9b7881]">Para realizar cambios</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-2xl font-extrabold text-[#4d0e18] mb-8">Mis Talleres Inscritos</h2>
          {misTalleres.length === 0 && !talleresLoading ? (
            <div className="bg-white/[0.01] border border-white/[0.04] border-dashed p-12 rounded-[2.5rem] text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={24} className="text-white/20" />
              </div>
              <p className="text-white/20 font-semibold uppercase tracking-wider text-sm">No tienes talleres inscritos</p>
              <p className="text-xs text-white/10 mt-2">Ve al catálogo para elegir uno</p>
              <Link
                to="/catalogo"
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#8B1A32] to-[#B8354D] text-white font-bold text-sm shadow-lg shadow-[#8B1A32]/20 hover:shadow-[#8B1A32]/40 transition-all duration-300 hover:scale-[1.02]"
              >
                <Search size={16} />
                Explorar catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {misTalleres.map(taller => (
                <TallerCard 
                  key={taller.id} 
                  taller={taller}
                  inscrito={true}
                  onBaja={() => openBajaDialog(taller.id, taller.nombre)}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-16 w-full max-w-[1600px] mx-auto">
        <h2 className="text-2xl font-extrabold text-white mb-8 max-w-[1400px] mx-auto px-4 md:px-0">Calendario Semanal</h2>
        <WeekCalendar talleres={misTalleres} />
      </div>

      <div className="mb-16 w-full max-w-[1400px] mx-auto px-4 md:px-0">
        <h2 className="text-2xl font-extrabold text-white mb-8">Mi Historial de Asistencia</h2>

        {asistencia.length === 0 ? (
          <div className="bg-white/[0.01] border border-white/[0.04] border-dashed p-12 rounded-[2.5rem] text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <CalendarDays size={24} className="text-white/20" />
            </div>
            <p className="text-white/20 font-semibold uppercase tracking-wider text-sm">Sin registros de asistencia</p>
            <p className="text-xs text-white/10 mt-2">Tu historial aparecerá aquí cuando se registre asistencia</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card p-5 rounded-3xl border border-white/[0.04] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8B1A32]/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#8B1A32]/10 border border-[#8B1A32]/15 flex items-center justify-center text-[#8B1A32]">
                    <CalendarDays size={16} />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Sesiones</p>
                </div>
                <p className="text-2xl font-extrabold text-white">{asistenciaSummary.total}</p>
              </div>

              <div className="glass-card p-5 rounded-3xl border border-white/[0.04] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Percent size={16} />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Asistencia</p>
                </div>
                <p className="text-2xl font-extrabold text-white">{asistenciaSummary.porcentaje}%</p>
              </div>

              <div className="glass-card p-5 rounded-3xl border border-white/[0.04] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <Search size={16} />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Presentes</p>
                </div>
                <p className="text-2xl font-extrabold text-white">{asistenciaSummary.presentes}</p>
              </div>

              <div className="glass-card p-5 rounded-3xl border border-white/[0.04] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8B1A32]/5 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-xl bg-[#8B1A32]/10 border border-[#8B1A32]/15 flex items-center justify-center text-[#d24a6b]">
                    <XCircle size={16} />
                  </div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Faltas</p>
                </div>
                <p className="text-2xl font-extrabold text-white">{asistenciaSummary.ausentes}</p>
              </div>
            </div>

            <div className="space-y-4">
              {Array.from(asistenciaByTaller.entries()).map(([tallerId, { taller_nombre, records }]) => {
                const isExpanded = expandedTalleres[tallerId] ?? true;
                return (
                  <div key={tallerId} className="glass-card rounded-3xl border border-white/[0.04] overflow-hidden">
                    <button
                      onClick={() => toggleTaller(tallerId)}
                      className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B1A32]/20 to-[#5C1020]/10 border border-[#8B1A32]/15 flex items-center justify-center text-[#8B1A32]">
                          <CalendarDays size={18} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{taller_nombre}</h3>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">{records.length} registros</p>
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={cn(
                          'text-white/30 transition-transform duration-300',
                          !isExpanded && '-rotate-90'
                        )}
                      />
                    </button>

                    <div
                      className={cn(
                        'transition-all duration-300 ease-out overflow-hidden',
                        isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                      )}
                    >
                      <div className="px-5 pb-5">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-white/[0.06]">
                                <th className="text-left text-[10px] uppercase tracking-widest text-white/30 font-bold py-3 pr-4">Fecha</th>
                                <th className="text-left text-[10px] uppercase tracking-widest text-white/30 font-bold py-3 pr-4">Estado</th>
                                <th className="text-left text-[10px] uppercase tracking-widest text-white/30 font-bold py-3 pr-4">Hora</th>
                                <th className="text-left text-[10px] uppercase tracking-widest text-white/30 font-bold py-3">Observaciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {records.map((record, idx) => (
                                <tr key={idx} className="border-b border-white/[0.03] last:border-0">
                                  <td className="py-3 pr-4 text-white/70 font-medium whitespace-nowrap">
                                    {new Date(record.fecha + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </td>
                                  <td className="py-3 pr-4">
                                    <EstadoBadge estado={record.estado as EstadoAsistencia} size="sm" />
                                  </td>
                                  <td className="py-3 pr-4 text-white/40 font-mono text-xs whitespace-nowrap">
                                    {record.hora ? record.hora.slice(0, 5) : '—'}
                                  </td>
                                  <td className="py-3 text-white/30 text-xs max-w-[200px] truncate">
                                    {record.observaciones || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <BajaDialog
        open={bajaDialogOpen}
        onOpenChange={setBajaDialogOpen}
        tallerNombre={bajaTarget?.nombre ?? ''}
        cambiosRestantes={profile?.cambios_restantes ?? 3}
        onConfirm={handleBaja}
        loading={actionLoading}
      />
    </div>
  )
}
