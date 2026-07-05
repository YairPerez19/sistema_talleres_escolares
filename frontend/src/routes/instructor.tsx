import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { useInstructorTalleres } from '../hooks/useInstructor'
import { Header } from '../components/Header'
import { ListaAsistencia } from '../components/asistencia/ListaAsistencia'
import { useState } from 'react'
import { cn } from '../lib/utils'
import type { TallerConInstructor } from '../lib/types'
import { usePageMeta } from '../hooks/usePageMeta'
import { Clock, Loader2 } from '@/components/AnimatedIcons'
import {
  MapPin, ChevronRight, ArrowLeft,
  BookOpen, Wifi, Info
} from '@/components/icons'

export const Route = createFileRoute('/instructor')({
  component: InstructorDashboard,
})

function InstructorDashboard() {
  usePageMeta({
    title: 'Panel Instructor',
    description: 'Panel de instructor del Sistema Integral de Talleres Escolares. Gestiona la asistencia de tus alumnos en el CBTis No. 61.',
    canonicalPath: '/instructor',
    noindex: true,
  })
  const { user } = useAuth()
  const navigate = useNavigate()
  const { loading: roleLoading } = useRole(user?.id)
  const { talleres, loading: talleresLoading } = useInstructorTalleres(user?.id)
  const [selectedTaller, setSelectedTaller] = useState<TallerConInstructor | null>(null)

  if (!user && !roleLoading) {
    navigate({ to: '/auth' })
    return null
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

  return (
    <div className="flex flex-col pt-4 pb-20 w-full">
      <div className="bg-[#0a0205]/60 backdrop-blur-[24px] border border-white/[0.04] mb-8 p-4 md:p-6 rounded-[2rem] w-full max-w-[1400px] mx-auto shadow-lg shadow-black/20">
        <Header />
        <div className="pt-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[#ff0055]/70 mb-2 block">
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
              // CAMBIO: Ahora es una lista vertical (una sola columna)
              <div className="flex flex-col gap-4">
                {talleres.map(taller => (
                  <TallerInstructorRow
                    key={taller.id}
                    taller={taller}
                    onClick={() => setSelectedTaller(taller)}
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
              onClick={() => setSelectedTaller(null)}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 text-sm font-bold"
            >
              <ArrowLeft size={16} />
              Volver a la lista
            </button>

            <div className="glass-card p-6 md:p-8 rounded-[2.5rem]">
              <ListaAsistencia
                tallerId={selectedTaller.id}
                tallerNombre={selectedTaller.nombre}
                soloLectura={false}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// NUEVO COMPONENTE: Fila de taller (en lugar de tarjeta)
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
