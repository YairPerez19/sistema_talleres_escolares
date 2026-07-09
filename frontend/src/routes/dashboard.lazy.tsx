import { createLazyFileRoute } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { Header } from '../components/Header'
import { useTalleres, useInscripciones, useProfile } from '../hooks/useTalleres'
import { WeekCalendar } from '../components/WeekCalendar'
import { TallerCard } from '../components/TallerCard'
import { toast } from 'sonner'
import { supabase } from '../integrations/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { Clock, RefreshCw } from '@/components/AnimatedIcons'
import { DollarSign } from '@/components/icons'
import { usePageMeta } from '../hooks/usePageMeta'
import { cn } from '../lib/utils'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { BajaDialog } from '../components/BajaDialog'

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

    // @ts-expect-error Supabase typed client limitation with custom types.ts
    const { data, error } = await supabase.rpc('dar_baja_taller', {
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

  if (!user && !talleresLoading) {
    return <div className="pt-32 px-10 text-center">Inicia sesión para ver tu horario</div>;
  }

  return (
    <div className="flex flex-col pt-4 pb-20 w-full">
      <div className="bg-[#0a0205]/60 backdrop-blur-[24px] border border-white/[0.04] mb-10 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto shadow-lg shadow-black/20">
        <Header />
        <div className="pt-6">
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#8B1A32]/70 mb-2 block">Mi Dashboard</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Mi Horario Escolar</h1>
        </div>
      </div>

      <div className="mt-8 mb-16 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div ref={sidebarRef} className="lg:col-span-1 space-y-6">
          <div className="sidebar-card glass-card p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B1A32]/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B1A32]/20 to-[#5C1020]/10 border border-[#8B1A32]/15 flex items-center justify-center text-[#8B1A32] mb-4">
              <DollarSign size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-3">Estado de Cuenta</h3>
            <div className="bg-black/60 rounded-2xl p-5 border border-white/[0.04]">
              <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-1">Total a Pagar</p>
              <p className="text-3xl md:text-4xl font-extrabold text-white">${deuda.toFixed(2)}</p>
            </div>
          </div>

          <div className="sidebar-card glass-card p-6 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8B1A32]/5 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B1A32]/20 to-[#5C1020]/10 border border-[#8B1A32]/15 flex items-center justify-center text-[#8B1A32] mb-4">
              <RefreshCw size={22} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Cambios Disponibles</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-4">Límite de 3 por ciclo</p>
            
            {!profile ? (
              <div className="flex gap-2 mb-6 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="flex-1 h-2 rounded-full bg-white/5" />)}
              </div>
            ) : (
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${i <= (profile?.cambios_restantes ?? 0) ? 'bg-gradient-to-r from-[#8B1A32] to-[#B8354D] shadow-[0_0_10px_rgba(139,26,50,0.3)]' : 'bg-white/[0.06]'}`} 
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-white/60">
              <Clock size={16} className={cn("text-[#8B1A32]", !profile && "animate-pulse")} />
              <div>
                <p className="text-xs font-bold text-white/70">
                  {!profile ? 'Calculando...' : `${diasRestantes} días restantes`}
                </p>
                <p className="text-[10px] text-white/30">Para realizar cambios</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <h2 className="text-2xl font-extrabold text-white mb-8">Mis Talleres Inscritos</h2>
          {misTalleres.length === 0 && !talleresLoading ? (
            <div className="bg-white/[0.01] border border-white/[0.04] border-dashed p-12 rounded-[2.5rem] text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center mx-auto mb-4">
                <RefreshCw size={24} className="text-white/20" />
              </div>
              <p className="text-white/20 font-semibold uppercase tracking-wider text-sm">No tienes talleres inscritos</p>
              <p className="text-xs text-white/10 mt-2">Ve al catálogo para elegir uno</p>
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
