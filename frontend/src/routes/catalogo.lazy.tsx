import { createLazyFileRoute } from '@tanstack/react-router'
import React, { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Header } from '../components/Header'
import { TallerCard } from '../components/TallerCard'
import { Filters } from '../components/Filters'
import { tieneColision } from '../lib/talleres'
import type { Taller, Horario } from '../lib/talleres'
import { supabase } from '../integrations/supabase/client'
import { toast } from 'sonner'
import gsap from 'gsap'
import { usePageMeta } from '../hooks/usePageMeta'
import { useGSAP } from '@gsap/react'
import { useTalleres as useTalleresHook, useInscripciones as useInscripcionesHook, useProfile } from '../hooks/useTalleres'
import { BajaDialog } from '../components/BajaDialog'

const ITEMS_PER_PAGE = 9

export const Route = createLazyFileRoute('/catalogo')({
  component: CatalogoPage,
})

function CatalogoPage() {
  usePageMeta({
    title: 'Catálogo de Talleres',
    description: 'Explora el catálogo completo de talleres culturales, cívicos y deportivos del CBTis No. 61. Filtra por categoría y encuentra el taller ideal para ti.',
    canonicalPath: '/catalogo',
  })
  const { talleres, loading: talleresLoading } = useTalleresHook();
  const { user } = useAuth();
  const { inscritosIds, refresh: refreshInscripciones } = useInscripcionesHook(user?.id);
  const { profile, refreshProfile, setCambios } = useProfile(user?.id);
  
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [bajaDialogOpen, setBajaDialogOpen] = useState(false);
  const [bajaTarget, setBajaTarget] = useState<{ tallerId: string; nombre: string } | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const gridRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    let result = talleres;
    if (category) result = result.filter(t => t.categoria === category);
    if (search) result = result.filter(t => t.nombre.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [talleres, category, search]);

  const visibleTalleres = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  useGSAP(() => {
    if (gridRef.current && !talleresLoading) {
      gsap.fromTo(gridRef.current.children, 
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.06, duration: 0.7, ease: 'back.out(1.4)' }
      );
    }
  }, [visibleTalleres.length, talleresLoading]);

  React.useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [category, search]);

  const checkConstraints = () => {
    if (!profile) return true;
    if (profile.inscripcion_limite && new Date() > new Date(profile.inscripcion_limite)) {
      toast.error('El periodo de inscripciones ha finalizado.');
      return false;
    }
    if ((profile.cambios_restantes ?? 0) <= 0) {
      toast.error('Has agotado tus 3 cambios permitidos.');
      return false;
    }
    return true;
  };

  const handleInscribir = async (taller: Taller & { horarios: Horario[] }) => {
    if (!user) {
      toast.error('Inicia sesión para inscribirte');
      return;
    }
    if (!checkConstraints()) return;

    setActionLoading(true);
    // @ts-expect-error Supabase typed client limitation with custom types.ts
    const { error } = await supabase.from('inscripciones').insert({
      alumno_id: user.id,
      taller_id: taller.id
    });
    
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

  const openBajaDialog = (tallerId: string, nombre: string) => {
    const cambiosActuales = profile?.cambios_restantes ?? 3;
    if (cambiosActuales <= 0) {
      toast.error('Has agotado tus 3 cambios permitidos.');
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

  const inscritosFull = talleres.filter(t => inscritosIds.has(t.id));
  const inscritosHorarios = inscritosFull.flatMap(t => t.horarios);

  return (
    <div className="flex flex-col pt-4 pb-20 overflow-visible max-w-[1400px] mx-auto px-4 md:px-8">
      
      <div className="sticky top-4 z-50 bg-[#0a0205]/80 backdrop-blur-[24px] border border-white/[0.04] mb-8 p-4 md:p-6 rounded-[2rem] space-y-4 shadow-lg shadow-black/20">
        <Header />
        <div className="flex justify-between items-center px-2">
          <Filters 
            category={category} setCategory={setCategory} 
            search={search} setSearch={setSearch} 
          />
          {profile && (
            <div className="hidden lg:flex items-center gap-3 bg-white/[0.03] px-4 py-2 rounded-2xl border border-white/[0.05]">
              <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Cambios</span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-3 h-1.5 rounded-full transition-all duration-300 ${i <= (profile.cambios_restantes ?? 0) ? 'bg-gradient-to-r from-[#8B1A32] to-[#B8354D] shadow-[0_0_8px_rgba(139,26,50,0.3)]' : 'bg-white/[0.06]'}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {talleresLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-[3px] border-[#8B1A32]/20 border-t-[#8B1A32] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleTalleres.map(taller => {
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
                    onBaja={() => openBajaDialog(taller.id, taller.nombre)}
                    loading={actionLoading}
                 />
              );
            })}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-12">
              <button
                type="button"
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
                className="px-8 py-4 rounded-2xl font-bold text-sm bg-white/[0.03] border border-white/[0.08] text-white/60 hover:text-white hover:border-[#8B1A32]/30 hover:bg-white/[0.06] transition-all duration-300"
              >
                Mostrar más talleres ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}

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
