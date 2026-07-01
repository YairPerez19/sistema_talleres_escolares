import { createFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Header } from '../components/Header'
import { TallerCard } from '../components/TallerCard'
import { Filters } from '../components/Filters'
import { tieneColision } from '../lib/talleres'
import { supabase } from '../integrations/supabase/client'
import { toast } from 'sonner'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useTalleres as useTalleresHook, useInscripciones as useInscripcionesHook, useProfile } from '../hooks/useTalleres'

export const Route = createFileRoute('/catalogo')({
  component: CatalogoPage,
})

function CatalogoPage() {
  const { talleres, loading: talleresLoading } = useTalleresHook();
  const { user } = useAuth();
  const { inscritosIds, refresh: refreshInscripciones } = useInscripcionesHook(user?.id);
  const { profile, refreshProfile, setCambios } = useProfile(user?.id);
  
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const gridRef = React.useRef<HTMLDivElement>(null);

  const filtered = talleres.filter(t => {
    if (category && t.categoria !== category) return false;
    if (search && !t.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  useGSAP(() => {
    if (gridRef.current) {
      gsap.fromTo(gridRef.current.children, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, stagger: 0.05, duration: 0.8, ease: 'expo.out' }
      );
    }
  }, [filtered.length, talleresLoading]);

  const checkConstraints = () => {
    if (!profile) return true;
    if (new Date() > new Date(profile.inscripcion_limite)) {
      toast.error('El periodo de inscripciones ha finalizado.');
      return false;
    }
    if (profile.cambios_restantes <= 0) {
      toast.error('Has agotado tus 3 cambios permitidos.');
      return false;
    }
    return true;
  };

  const handleInscribir = async (taller: any) => {
    if (!user) {
      toast.error('Inicia sesión para inscribirte');
      return;
    }
    if (!checkConstraints()) return;

    setActionLoading(true);
    const { error } = await supabase.from('inscripciones').insert({
      alumno_id: user.id,
      taller_id: taller.id
    } as any);
    
    if (error) {
      if (error.message.includes('Colisión')) {
        toast.error('Colisión de horarios detectada');
      } else {
        toast.error('Error al inscribir: ' + error.message);
      }
    } else {
      toast.success(`Te has inscrito a ${taller.nombre}`);
      refreshInscripciones();
      refreshProfile();
    }
    setActionLoading(false);
  };

  const handleBaja = async (tallerId: string, nombre: string) => {
    if (!user) return;
    const cambiosActuales = profile?.cambios_restantes ?? 3;
    if (cambiosActuales <= 0) {
      toast.error('Has agotado tus 3 cambios permitidos.');
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
      toast.error('Error al dar de baja');
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

  const inscritosFull = talleres.filter(t => inscritosIds.has(t.id));
  const inscritosHorarios = inscritosFull.flatMap(t => t.horarios);

  return (
    <div className="flex flex-col pt-4 pb-20 overflow-visible max-w-[1400px] mx-auto px-4 md:px-8">
      
      {/* Header and Filters Container */}
      <div className="sticky top-4 z-50 glass-card mb-8 p-4 md:p-6 rounded-[2rem] space-y-4 shadow-2xl bg-black/20 backdrop-blur-[24px]">
        <Header />
        <div className="flex justify-between items-center px-2">
           <Filters 
            category={category} setCategory={setCategory} 
            search={search} setSearch={setSearch} 
          />
          {profile && (
            <div className="hidden lg:flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Cambios</span>
              <div className="flex gap-1">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-3 h-1 rounded-full ${i <= profile.cambios_restantes ? 'bg-primary-glow' : 'bg-white/10'}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {talleresLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary-glow rounded-full animate-spin" />
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(taller => {
            const isOurs = inscritosIds.has(taller.id);
            const conflictHorario = !isOurs ? tieneColision(taller.horarios, inscritosHorarios) : null;
            const colisionaCon = conflictHorario ? talleres.find(t => t.id === conflictHorario.taller_id)?.nombre : null;

            return (
               <TallerCard 
                 key={taller.id} 
                 taller={taller}
                 inscrito={isOurs}
                 colisionaCon={colisionaCon}
                 onInscribir={() => handleInscribir(taller)}
                 onBaja={() => handleBaja(taller.id, taller.nombre)}
                 loading={actionLoading}
               />
            );
          })}
        </div>
      )}
    </div>
  )
}
