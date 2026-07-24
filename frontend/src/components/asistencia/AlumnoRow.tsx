import { useState } from 'react';
import type { AlumnoConAsistencia, EstadoAsistencia } from '../../lib/types';
import { ESTADO_CONFIG } from '../../lib/types';
import { EstadoBadge } from './EstadoBadge';
import { cn } from '../../lib/utils';
import { MessageSquare, Loader2 } from '@/components/AnimatedIcons';
import { Check, X, Clock, FileText } from '@/components/icons';

const OPCIONES_RAPIDAS: { estado: EstadoAsistencia; icon: React.ReactNode }[] = [
  { estado: 'presente',    icon: <Check    size={15} strokeWidth={2.6} /> },
  { estado: 'ausente',     icon: <X        size={15} strokeWidth={2.6} /> },
  { estado: 'retardo',     icon: <Clock    size={15} strokeWidth={2.4} /> },
  { estado: 'justificado', icon: <FileText size={15} strokeWidth={2.2} /> },
];

interface AlumnoRowProps {
  alumno: AlumnoConAsistencia;
  onMarcar: (estado: EstadoAsistencia, observaciones?: string) => Promise<void>;
  isSaving: boolean;
  soloLectura?: boolean;
}

export function AlumnoRow({ alumno, onMarcar, isSaving, soloLectura = false }: AlumnoRowProps) {
  const [showObs, setShowObs] = useState(false);
  const [obs, setObs] = useState(alumno.observaciones ?? '');

  const handleMarcar = async (estado: EstadoAsistencia) => {
    if (soloLectura || isSaving) return;
    await onMarcar(estado, obs || undefined);
  };

  const handleGuardarObs = async () => {
    if (soloLectura || isSaving) return;
    await onMarcar(alumno.estado === 'sin_registro' ? 'presente' : alumno.estado as EstadoAsistencia, obs || undefined);
    setShowObs(false);
  };

  return (
    <div className={cn(
      'group flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border transition-all duration-200',
      'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
    )}>
      {/* Info del alumno */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary-glow font-black text-sm">
            {alumno.nombre.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{alumno.nombre}</p>
          <p className="text-[10px] text-white/40 font-mono">{alumno.matricula}</p>
        </div>
        <div className="hidden md:block ml-2">
          <span className="text-[9px] uppercase tracking-widest text-white/30 font-bold px-2 py-0.5 rounded-full bg-white/5">
            {alumno.turno}
          </span>
        </div>
      </div>

      {/* Estado actual */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <EstadoBadge estado={alumno.estado} size="sm" />
        {alumno.hora && (
          <span className="text-[10px] text-white/30 font-mono">{alumno.hora.slice(0, 5)}</span>
        )}
      </div>

      {/* Botones de acción rápida */}
      {!soloLectura && (
        <div className="flex items-center gap-1.5">
          {OPCIONES_RAPIDAS.map(({ estado, icon }) => {
            const isActive = alumno.estado === estado;
            const config = ESTADO_CONFIG[estado];
            return (
              <button
                key={estado}
                onClick={() => handleMarcar(estado)}
                disabled={isSaving}
                title={config.label}
                className={cn(
                  'w-9 h-9 rounded-xl border text-sm font-bold transition-all duration-150 flex items-center justify-center',
                  'hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                  isActive
                    ? cn(config.bg, config.border, config.color, 'shadow-lg shadow-[#8B1A32]/20')
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70'
                )}
              >
                {isSaving && isActive
                  ? <Loader2 size={12} className="animate-spin text-white/50" />
                  : icon}
              </button>
            );
          })}

          {/* Botón de observaciones */}
          <button
            onClick={() => setShowObs(v => !v)}
            title="Agregar observación"
            className={cn(
              'w-9 h-9 rounded-xl border text-xs transition-all duration-150 flex items-center justify-center',
              showObs
                ? 'bg-[#8B1A32]/20 border-[#8B1A32]/40 text-[#f4d78e]'
                : 'bg-white/5 border-white/10 text-white/30 hover:text-white/60 hover:bg-white/10'
            )}
          >
            <MessageSquare size={14} />
          </button>
        </div>
      )}

      {/* Observaciones expandible */}
      {showObs && !soloLectura && (
        <div className="w-full flex gap-2 mt-1">
          <input
            value={obs}
            onChange={e => setObs(e.target.value)}
            placeholder="Observación (opcional)..."
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/40"
          />
          <button
            onClick={handleGuardarObs}
            className="px-4 py-2 rounded-xl bg-primary/20 text-primary-glow text-xs font-bold border border-primary/20 hover:bg-primary/30 transition-all"
          >
            Guardar
          </button>
        </div>
      )}
    </div>
  );
}
