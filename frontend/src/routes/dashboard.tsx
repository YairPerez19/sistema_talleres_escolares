import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { Header } from '../components/Header'
import { useTalleres, useInscripciones, useProfile } from '../hooks/useTalleres'
import { WeekCalendar } from '../components/WeekCalendar'
import { TallerCard } from '../components/TallerCard'
import { toast } from 'sonner'
import { supabase } from '../integrations/supabase/client'
import { useState, useEffect } from 'react'
import { DollarSign, Clock, RefreshCw } from '@/components/AnimatedIcons'
import { cn } from '../lib/utils'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { user } = useAuth();
  const { talleres, loading: talleresLoading } = useTalleres();
  const { inscritosIds, refresh: refreshInscripciones } = useInscripciones(user?.id);
  const { profile, refreshProfile, setCambios } = useProfile(user?.id);
  const [actionLoading, setActionLoading] = useState(false);
  const [deuda, setDeuda] = useState(0);

  useEffect(() => {
    if (user) {
      supabase.from('deuda_alumnos')
        .select('deuda_total')
        .eq('alumno_id', user.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setDeuda(data.deuda_total || 0);
          }
        });
    }
  }, [user]);

  const handleBaja = async (tallerId: string, nombre: string) => {
    if (!user) return;
    const cambiosActuales = profile?.cambios_restantes ?? 3;
    if (cambiosActuales <= 0) {
      toast.error('No puedes darte de baja: has agotado tus 3 cambios permitidos.');
      return;
    }

    if (!confirm('¿Deseas darte de baja? Esto restará 1 a tus cambios permitidos.')) return;

    setActionLoading(true);

    // 1. Actualización optimista: quitar la luz INMEDIATAMENTE
    const nuevosCambios = Math.max(cambiosActuales - 1, 0);
    setCambios(nuevosCambios);

    // 2. Eliminar inscripción
    const { error: errorBaja } = await supabase
      .from('inscripciones')
      .delete()
      .match({ alumno_id: user.id, taller_id: tallerId });

    if (errorBaja) {
      toast.error('Error al dar de baja: ' + errorBaja.message);
      setCambios(cambiosActuales); // revertir si falla
      setActionLoading(false);
      return;
    }

    // 3. Persistir en DB
    const { error: errorUpdate } = await supabase
      .from('profiles')
      .update({ cambios_restantes: nuevosCambios })
      .eq('id', user.id);

    if (errorUpdate) {
      console.error('Error al persistir cambios_restantes:', errorUpdate);
      toast.error('Error al guardar los cambios');
      setCambios(cambiosActuales);
      setActionLoading(false);
      return;
    }

    toast.success(`Dado de baja de ${nombre}. Te queda(n) ${nuevosCambios} cambio(s).`);
    refreshInscripciones();
    refreshProfile();
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
      <div className="glass-card mb-10 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto">
        <Header />
        <div className="pt-6">
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary-glow mb-2 block">Mi Dashboard</span>
          <h1 className="text-4xl font-extrabold text-white">Mi Horario Escolar</h1>
        </div>
      </div>

      <div className="mt-8 mb-16 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Información Estudiante */}
        <div className="lg:col-span-1 space-y-6">
          {/* Estado de Cuenta */}
          <div className="glass-card p-6 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-glow mb-4">
              <DollarSign size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Estado de Cuenta</h3>
            <div className="bg-black/40 rounded-2xl p-5 border border-white/5">
              <p className="text-xs uppercase tracking-widest text-white/40 font-bold mb-1">Total a Pagar</p>
              <p className="text-4xl font-black text-white">${deuda.toFixed(2)}</p>
            </div>
          </div>

          {/* Restricciones de Inscripción */}
          <div className="glass-card p-6 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary-glow mb-4">
              <RefreshCw size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Cambios Disponibles</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-4">Límite de 3 por ciclo</p>
            
            {!profile ? (
              <div className="flex gap-2 mb-6 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="flex-1 h-2 rounded-full bg-white/5" />)}
              </div>
            ) : (
              <div className="flex gap-2 mb-6">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`flex-1 h-2 rounded-full transition-all duration-500 ${i <= (profile?.cambios_restantes ?? 0) ? 'bg-primary-glow shadow-[0_0_10px_rgba(159,18,57,0.5)]' : 'bg-white/10'}`} 
                  />
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 text-white/70">
              <Clock size={16} className={cn("text-primary-glow", !profile && "animate-pulse")} />
              <div>
                <p className="text-xs font-bold">
                  {!profile ? 'Calculando...' : `${diasRestantes} días restantes`}
                </p>
                <p className="text-[10px] text-white/40">Para realizar cambios</p>
              </div>
            </div>
          </div>
        </div>

        {/* Talleres List */}
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-extrabold text-white mb-8">Mis Talleres Inscritos</h2>
          {misTalleres.length === 0 && !talleresLoading ? (
            <div className="glass-card p-10 rounded-[2.5rem] text-center border-dashed border-white/10">
              <p className="text-white/30 font-bold uppercase tracking-widest">No tienes talleres inscritos</p>
              <p className="text-xs text-white/20 mt-2 italic">Ve al catálogo para elegir uno</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {misTalleres.map(taller => (
                <TallerCard 
                  key={taller.id} 
                  taller={taller}
                  inscrito={true}
                  onBaja={() => handleBaja(taller.id, taller.nombre)}
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
    </div>
  )
}
