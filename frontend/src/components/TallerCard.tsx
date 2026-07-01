import * as React from 'react';
import { Taller, Horario, fmtHora } from '../lib/talleres';
import { cn } from '../lib/utils';
import { imagenDeTaller } from '../lib/tallerImages';
import { Clock, MapPin, User as UserIcon } from '@/components/AnimatedIcons';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

interface TallerCardProps {
  taller: Taller & { horarios: Horario[] };
  inscrito: boolean;
  onInscribir?: () => void;
  onBaja?: () => void;
  colisionaCon?: string | null;
  loading?: boolean;
}

export function TallerCard({ taller, inscrito, onInscribir, onBaja, colisionaCon, loading }: TallerCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  useGSAP(() => {
    const card = cardRef.current;
    if (!card) return;

    card.addEventListener('mouseenter', () => {
      gsap.to(imageRef.current, { scale: 1.1, duration: 0.6, ease: 'power2.out' });
      gsap.to(card, { y: -5, duration: 0.4, ease: 'back.out(1.7)' });
    });

    card.addEventListener('mouseleave', () => {
      gsap.to(imageRef.current, { scale: 1, duration: 0.6, ease: 'power2.out' });
      gsap.to(card, { y: 0, duration: 0.4, ease: 'power2.out' });
    });
  }, { scope: cardRef });

  const isBlocked = !!colisionaCon && !inscrito;
  const imageUrl = taller.imagen_url || imagenDeTaller(taller.nombre);

  return (
    <div ref={cardRef} className="group relative rounded-[2rem] bg-white/[0.02] border border-white/[0.05] overflow-hidden flex flex-col shadow-2xl transition-all duration-300 hover:bg-white/[0.04] hover:border-primary/40 hover:shadow-[0_0_20px_-12px_var(--color-primary-glow)]">
      
      {/* Image Section */}
      <div className="relative h-64 overflow-hidden">
        <img 
          ref={imageRef} 
          src={imageUrl} 
          alt={taller.nombre} 
          className="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity duration-500" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0A0D] via-transparent to-transparent" />
        
        <div className="absolute top-4 left-4">
          <span className="px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-black/60 border border-white/10 text-white/90 backdrop-blur-md">
            {taller.categoria.split('—')[0].trim()}
          </span>
        </div>

        {inscrito && (
          <div className="absolute top-4 right-4">
            <span className="px-3 py-1.5 text-[10px] font-bold tracking-wider rounded-full bg-green-500 text-white shadow-lg flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              Inscrito
            </span>
          </div>
        )}

        <div className="absolute bottom-4 left-6 right-6">
           <h3 className="text-2xl font-bold text-white leading-tight mb-0.5">{taller.nombre}</h3>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-6 pt-5 flex flex-col flex-1">
        
        <div className="space-y-3 text-[12px] font-medium text-white/50 mb-8 flex-1">
          <div className="flex items-center gap-3">
            <UserIcon size={14} className="text-white/30" />
            <span>{taller.instructor}</span>
          </div>
          <div className="flex items-center gap-3">
            <MapPin size={14} className="text-white/30" />
            <span>{taller.lugar}</span>
          </div>
          <div className="flex items-start gap-3">
            <Clock size={14} className="text-white/30 mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {taller.horarios.map(h => (
                <div key={h.id} className="bg-transparent border border-white/10 px-2.5 py-0.5 rounded text-white/60">
                   <span className="capitalize">{h.dia.slice(0,3)}</span> {fmtHora(h.hora_inicio)}-{fmtHora(h.hora_fin)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {inscrito ? (
          <button 
            onClick={onBaja} 
            disabled={loading}
            className="w-full py-3.5 rounded-2xl font-semibold text-[13px] bg-transparent border border-white/10 text-white hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Darse de baja
          </button>
        ) : (
          <button 
            onClick={onInscribir} 
            disabled={isBlocked || loading}
            className={cn(
              "w-full py-3.5 rounded-2xl font-semibold text-[13px] transition-all duration-300 flex items-center justify-center gap-2",
              isBlocked 
                ? "bg-transparent text-white/20 border border-white/5 cursor-not-allowed" 
                : "bg-transparent text-white border border-white/10 hover:bg-white/5 hover:border-primary/40 hover:shadow-[0_0_20px_-12px_var(--color-primary-glow)]"
            )}
          >
            {isBlocked ? `Choca con ${colisionaCon}` : 'Inscribirme'}
          </button>
        )}
      </div>
    </div>
  );
}
